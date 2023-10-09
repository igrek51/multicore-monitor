const GETTEXT_DOMAIN = 'my-multicore-indicator-extension';

const { GObject, St } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;

const {
    gettext: _,
} = ExtensionUtils;
const PI = 3.141592654;

const COLOR_BACKGROUND = Clutter.Color.from_string('#000000')[1];
const CORE_COLORS = [
    Clutter.Color.from_string('#E03D45')[1], // grapefruit
    Clutter.Color.from_string('#F18A00')[1], // tangerine
    Clutter.Color.from_string('#F3FF72')[1], // pastel yellow
    Clutter.Color.from_string('#EAF6B7')[1], // cream
    Clutter.Color.from_string('#00AA1F')[1], // green
    Clutter.Color.from_string('#1564C0')[1], // cornflower blue
    Clutter.Color.from_string('#9C42BA')[1], // purply
    Clutter.Color.from_string('#F85C51')[1], // coral
    Clutter.Color.from_string('#D3E379')[1], // greenish beige
    Clutter.Color.from_string('#E3E3E3')[1], // pale grey
    Clutter.Color.from_string('#FF8BA0')[1], // rose pink
    Clutter.Color.from_string('#54BD6C')[1], // dark mint
    Clutter.Color.from_string('#5BD8D2')[1], // topaz
    Clutter.Color.from_string('#F2D868')[1], // pale gold
    Clutter.Color.from_string('#134D30')[1], // evergreen
    Clutter.Color.from_string('#33008E')[1], // indigo
];

const CPU_STATS_INTERVAL = 1500; // in milliseconds
const CPU_GRAPH_WIDTH = 48;
const MEMORY_GRAPH_WIDTH = 48;
const DEBUG = false;

let cpuUsage = [];

function getCurrentCpuUsage() {
    const file = "/proc/stat";
    const contents = GLib.file_get_contents(file);
    if (!contents[0]) {
        return [];
    }
    const content = new TextDecoder().decode(contents[1]);
    const lines = content.split('\n');
    // first line represents the total CPU usage
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const core = i - 1;
        if (line.startsWith("cpu")) {
            const parts = line.split(/\s+/);
            if (parts.length >= 11) {
                const user = parseInt(parts[1]);
                const nice = parseInt(parts[2]);
                const system = parseInt(parts[3]);
                const idle = parseInt(parts[4]);
                const iowait = parseInt(parts[5]);
                const irq = parseInt(parts[6]);
                const softirq = parseInt(parts[7]);
                const steal = parseInt(parts[8]);
                const guest = parseInt(parts[9]);
                const guest_nice = parseInt(parts[10]);

                const total = user + nice + system + idle + iowait + irq + softirq + steal + guest + guest_nice;
                const busyTime = user + nice + system + irq + softirq + steal + guest + guest_nice;

                const busyDelta = busyTime - (cpuUsage[core]?.busyTime || 0);
                const totalDelta = total - (cpuUsage[core]?.total || 0);
                const usage = totalDelta > 0 ? (busyDelta / totalDelta) : 0;
                cpuUsage[core] = {
                    busyTime: busyTime,
                    total: total,
                    usage: usage,
                };
            }
        }
    }
    return cpuUsage;
}

function getCurrentMemoryStats() {
    const file = "/proc/meminfo";
    const contents = GLib.file_get_contents(file);
    if (!contents[0]) {
        return {};
    }
    const content = new TextDecoder().decode(contents[1]);
    const lines = content.split('\n');
    let memoryStats = {};

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const parts = line.split(/\s+/);
        if (parts.length === 3) {
            const key = parts[0].replace(":", "");
            const value = parseInt(parts[1], 10);
            memoryStats[key] = value; // in kilobytes
        }
    }

    const total = memoryStats["MemTotal"];
    const used = total - memoryStats["MemAvailable"];
    const swapUsed = memoryStats["SwapTotal"] - memoryStats["SwapFree"];
    const swapUsage = swapUsed / memoryStats["SwapTotal"];
    return {
        total: total,
        free: memoryStats["MemFree"],
        buffers: memoryStats["Buffers"],
        cached: memoryStats["Cached"],
        used: used,
        usage: used / total,
        available: memoryStats["MemAvailable"],
        dirty: memoryStats["Dirty"],
        writeback: memoryStats["Writeback"],
        swapFree: memoryStats["SwapFree"],
        swapTotal: memoryStats["SwapTotal"],
        swapUsed: swapUsed,
        swapUsage: swapUsage,
    };
}

function formatBytes(kbs) {
    if (kbs < 1024) {
        return `${kbs} KiB`
    } else if (kbs < 1024*1024) {
        return `${(kbs/1024).toFixed(2)} MiB`
    } else {
        return `${(kbs/1024/1024).toFixed(2)} GiB`
    }
}

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        this.memStats = {};
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        log('Enabling multicore system monitor.');
        this._indicator = new PanelMenu.Button(0.0, Me.metadata.name, false);
        
        this.area = new St.DrawingArea({
            reactive: false,
            width: CPU_GRAPH_WIDTH + MEMORY_GRAPH_WIDTH,
            height: 100,
            style_class: 'graph-drawing-area',
        });
        this.area.connect('repaint', this._draw.bind(this));
        this.timeout = Mainloop.timeout_add(CPU_STATS_INTERVAL, this.periodicUpdate.bind(this));
        
        let menuBox = new St.BoxLayout({ vertical: true });
        this.dynamicLabel = new St.Label({ text: "" });
        menuBox.add(this.dynamicLabel);
        let menuItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        menuItem.actor.add_actor(menuBox);
        
        this._indicator.menu.addMenuItem(menuItem);
        
        this._indicator.add_child(this.area);
        Main.panel.addToStatusArea(Me.metadata.uuid, this._indicator);
    }

    _draw() {
        let [totalWidth, h] = this.area.get_surface_size();
        let cr = this.area.get_context();
        // clear background
        Clutter.cairo_set_source_color(cr, COLOR_BACKGROUND);
        cr.rectangle(0, 0, totalWidth, h);
        cr.fill();

        this._drawCpu(cr, 0, 0, CPU_GRAPH_WIDTH, h);
        this._drawMemory(cr, CPU_GRAPH_WIDTH, 0, MEMORY_GRAPH_WIDTH, h);

        cr.$dispose();
    }

    _drawCpu(cr, xOffset, yOffset, w, h) {
        const cores = cpuUsage.length - 1;
        const binW = w / cores;
        for (let core = 0; core < cores; core++) {
            const usage = cpuUsage[core + 1].usage;
            const colorIndex = core % CORE_COLORS.length;
            Clutter.cairo_set_source_color(cr, CORE_COLORS[colorIndex]);
            cr.rectangle(xOffset + core * binW, yOffset + h * (1 - usage), binW, h * usage);
            cr.fill();
        }
    }

    _drawMemory(cr, xOffset, yOffset, w, h) {
        const centerX = xOffset + w/2;
        const centerY = yOffset + h/2;
        const radius = h/2;
        const startAngle = 0;
        const endAngle = 3.14;
        cr.lineWidth = 1;
        cr.moveTo(centerX, centerY);
        cr.arc(centerX, centerY, radius, startAngle, endAngle);
        cr.lineTo(centerX, centerY);
        cr.fill();
    }

    periodicUpdate() {
        getCurrentCpuUsage();
        this.memStats = getCurrentMemoryStats();
        this.dynamicLabel.text = this.buildIndicatorLabel();
        if (DEBUG) {
            for (let i = 0; i < cpuUsage.length - 1; i++) {
                log(`CPU Core ${i} usage: ${cpuUsage[i + 1].usage.toFixed(2)}`);
            }
            log('Memory stats', Object.entries(this.memStats));
        }
        this.area.queue_repaint();
        return true; // Return true to keep the timeout running
    }

    buildIndicatorLabel() {
        const lines = [];
        if (cpuUsage.length > 0) {
            const totalUsage = cpuUsage[0].usage * 100
            lines.push(`CPU usage: ${totalUsage.toFixed(2)}%`);
        }
        if (this.memStats.used) {
            const percentUsage = (this.memStats.usage * 100).toFixed(2);
            lines.push(`Memory usage: ${formatBytes(this.memStats.used)} / ${formatBytes(this.memStats.total)} (${percentUsage}%)`);
        }
        return lines.join("\n");
    }

    destroy() {
        if (this.timeout) {
            log('Multicore: Disabling periodic refresh')
            Mainloop.source_remove(this.timeout);
            this.timeout = null;
        }
    }

    disable() {
        this.destroy()
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
