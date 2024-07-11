import St from 'gi://St';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

const PI = 3.141592654;
const METADATA_NAME = 'multicore-system-monitor';
const METADATA_UUID = 'multicore-system-monitor@igrek.dev';

const COLOR_BACKGROUND = parseColor('#000000');
const CORE_COLORS = [
    parseColor('#E03D45'), // grapefruit
    parseColor('#F85C51'), // coral
    parseColor('#F18A00'), // tangerine
    parseColor('#FF8BA0'), // rose pink
    parseColor('#F2D868'), // pale gold
    parseColor('#F3FF72'), // pastel yellow
    parseColor('#EAF6B7'), // cream
    parseColor('#E3E3E3'), // pale grey
    parseColor('#54BD6C'), // dark mint
    parseColor('#00AA1F'), // green
    parseColor('#17703A'), // jungle green
    parseColor('#1564C0'), // cornflower blue
    parseColor('#5BD8D2'), // topaz
    parseColor('#7990E3'), // periwinkle blue
    parseColor('#4C00D3'), // purply blue
    parseColor('#9C42BA'), // purply
];
const COLOR_MEM_USED = parseColor('#F3F3F3');
const COLOR_MEM_CACHED = parseColor('#BBBBBB');
const COLOR_MEM_BUFFERS = parseColor('#767676');
const COLOR_MEM_DIRTY = parseColor('#F18A00');
const COLOR_SWAP = parseColor('#1F613060');

const STAT_REFRESH_INTERVAL = 2; // in seconds
const CPU_GRAPH_WIDTH = 48;
const MEMORY_GRAPH_WIDTH = 44;
const MEMORY_PIE_ORIENTATION = 0;
const PANEL_POSITION = 10; // higher - rightmost
const DEBUG = false;
const DEBUG_RANDOM = false;

let cpuUsage = []; // first line represents the total CPU usage, next - consecutive cores

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

                const busyDelta = busyTime - (cpuUsage[i]?.busyTime || 0);
                const totalDelta = total - (cpuUsage[i]?.total || 0);
                const usage = totalDelta > 0 ? (busyDelta / totalDelta) : 0;
                cpuUsage[i] = {
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
        dirtyWriteback: memoryStats["Dirty"] + memoryStats["Writeback"],
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

function parseColor(hashString) {
    return Clutter.Color.from_string(hashString)[1];
}

export default class MyExtension extends Extension {
    constructor(metadata) {
        super(metadata);
    }

    enable() {
        console.log('Enabling multicore system monitor.');
        this.memStats = {};
        this._indicator = new PanelMenu.Button(0.0, METADATA_NAME, false);
        
        this.area = new St.DrawingArea({
            reactive: false,
            width: CPU_GRAPH_WIDTH + MEMORY_GRAPH_WIDTH,
            height: 100,
            style_class: 'graph-drawing-area',
        });
        this.area.connect('repaint', this._draw.bind(this));
        this.timeout = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            STAT_REFRESH_INTERVAL,
            this.periodicUpdate.bind(this)
        );
        
        let menuBox = new St.BoxLayout({ vertical: true });
        this.dynamicLabel = new St.Label({ text: "" });
        menuBox.add_child(this.dynamicLabel);
        let menuItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        menuItem.actor.add_child(menuBox);
        
        this._indicator.menu.addMenuItem(menuItem);
        
        this._indicator.add_child(this.area);
        Main.panel.addToStatusArea(METADATA_UUID, this._indicator, PANEL_POSITION, Main.panel._rightBox);
    }

    _draw() {
        let [totalWidth, h] = this.area.get_surface_size();
        let cr = this.area.get_context();
        // clear background
        cr.setSourceColor(COLOR_BACKGROUND);
        cr.rectangle(0, 0, totalWidth, h);
        cr.fill();

        this._drawCpu(cr, 0, 0, CPU_GRAPH_WIDTH, h);
        if (this.memStats.used) {
            this._drawMemory(cr, CPU_GRAPH_WIDTH, 0, MEMORY_GRAPH_WIDTH, h);
        }

        cr.$dispose();
    }

    _drawCpu(cr, xOffset, yOffset, w, h) {
        const cores = cpuUsage.length - 1;
        const binW = w / cores;
        for (let core = 0; core < cores; core++) {
            const usage = DEBUG_RANDOM ? Math.random() : cpuUsage[core + 1].usage;
            const colorIndex = core % CORE_COLORS.length;
            cr.setSourceColor(CORE_COLORS[colorIndex]);
            cr.rectangle(xOffset + core * binW, yOffset + h * (1 - usage), binW, h * usage);
            cr.fill();
        }
    }

    _drawMemory(cr, xOffset, yOffset, w, h) {
        this._drawMemorySwap(cr, xOffset, yOffset, w, h);

        const centerX = xOffset + w/2;
        const centerY = yOffset + h/2;
        const smallDim = Math.min(w, h);
        const radius = smallDim/2;
        let angle = 0;
        
        const totalMem = this.memStats.total;
        cr.setSourceColor(COLOR_MEM_USED);
        angle = this._drawMemoryPiece(cr, centerX, centerY, radius, angle, this.memStats.used / totalMem);
        cr.setSourceColor(COLOR_MEM_CACHED);
        angle = this._drawMemoryPiece(cr, centerX, centerY, radius, angle, this.memStats.cached / totalMem);
        cr.setSourceColor(COLOR_MEM_BUFFERS);
        angle = this._drawMemoryPiece(cr, centerX, centerY, radius, angle, this.memStats.buffers / totalMem);
        cr.setSourceColor(COLOR_MEM_DIRTY);
        angle = this._drawMemoryPiece(cr, centerX, centerY, radius, angle, this.memStats.dirtyWriteback / totalMem);

        this._drawMemorySwap(cr, xOffset, yOffset, w, h); // Swap fill
    }

    _drawMemoryPiece(cr, centerX, centerY, radius, startFraction, fraction) {
        const startAngle = (startFraction + MEMORY_PIE_ORIENTATION) * 2 * PI;
        const endAngle = startAngle + fraction * 2 * PI;
        cr.setLineWidth(1);
        cr.moveTo(centerX, centerY);
        cr.arc(centerX, centerY, radius, startAngle, endAngle);
        cr.lineTo(centerX, centerY);
        cr.fill();
        return startFraction + fraction;
    }

    _drawMemorySwap(cr, xOffset, yOffset, w, h) {
        cr.setSourceColor(COLOR_SWAP);
        const swapUsage = this.memStats.swapUsage || 0;
        cr.rectangle(xOffset, yOffset + h * (1 - swapUsage), w, h * swapUsage);
        cr.fill();
    }

    periodicUpdate() {
        getCurrentCpuUsage();
        this.memStats = getCurrentMemoryStats();
        this.dynamicLabel.text = this.buildIndicatorLabel();
        if (DEBUG) {
            for (let i = 0; i < cpuUsage.length - 1; i++) {
                console.log(`CPU Core ${i} usage: ${cpuUsage[i + 1].usage.toFixed(2)}`);
            }
            console.log('Memory stats', Object.entries(this.memStats));
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
            const swapUsage = (this.memStats.swapUsage * 100).toFixed(2);
            lines.push(`Memory usage: ${formatBytes(this.memStats.used)} / ${formatBytes(this.memStats.total)} (${percentUsage}%)`);
            lines.push(`Cache: ${formatBytes(this.memStats.cached)}`);
            lines.push(`Buffers: ${formatBytes(this.memStats.buffers)}`);
            lines.push(`Dirty / Writeback: ${formatBytes(this.memStats.dirtyWriteback)}`);
            lines.push(`Swap: ${formatBytes(this.memStats.swapUsed)} / ${formatBytes(this.memStats.swapTotal)} (${swapUsage}%)`);
        }
        return lines.join("\n");
    }

    destroy() {
        if (this.timeout) {
            GLib.source_remove(this.timeout);
            this.timeout = null;
            console.log('Multicore: Periodic refresh disabled')
        }
    }

    disable() {
        this.destroy()
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        cpuUsage = [];
        this.memStats = {};
    }
}
