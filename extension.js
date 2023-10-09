const GETTEXT_DOMAIN = 'my-multicore-indicator-extension';

const { GObject, St } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;

const {
    gettext: _,
} = ExtensionUtils;

const COLOR_1 = Clutter.Color.from_string('#ff0000')[1];

// const CpuMonitor = new Lang.Class({
//     Name: 'CpuMonitor',
//     _init: function() {
//         this.actor = new St.BoxLayout({ style_class: 'cpu-monitor-box' });
//         this.actor.set_vertical(true);
//         this.cpuUsage = [];
//         this.numCores = GLib.get_num_processors();
//         for (let i = 0; i < this.numCores; i++) {
//             let bar = new St.Bin({
//                 style_class: 'cpu-monitor-bar',
//                 reactive: false,
//                 can_focus: false,
//                 x_fill: true,
//                 y_fill: true,
//                 track_hover: false,
//             });
//             this.cpuUsage[i] = bar;
//             this.actor.add_child(bar);
//         }
//         this.updateCpuUsage();
//     },
//     updateCpuUsage: function() {
//         let [, usage] = GLib.get_cpu_usage();
//         for (let i = 0; i < this.numCores; i++) {
//             this.cpuUsage[i].set_height(usage[i] / 100 * Main.panel.height);
//         }
//         timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, Lang.bind(this, this.updateCpuUsage));
//     },

// this.drawable = new St.DrawingArea({style_class: 'drawable'});

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        log('Enabling multicore system monitor.');
        this._indicator = new PanelMenu.Button(0.0, Me.metadata.name, false);
        
        this.area = new St.DrawingArea({
            reactive: false,
            style_class: 'graph-drawing-area',
        });

        this.area.set_width(100);
        this.area.set_height(100);
        this.area.connect('repaint', this._draw.bind(this));

        this._indicator.add_child(this.area);



        // let item = new PopupMenu.PopupMenuItem(_('Notify me again'));
        // item.connect('activate', () => {
        //     log('This is a regular log message.');
        //     Main.notify(_('notification'));
        // });
        // this._indicator.menu.addMenuItem(item);

        // let item2 = new PopupMenu.PopupMenuItem(_('Prefs'));
        // item2.connect('activate', () => {
        //     ExtensionUtils.openPrefs()
        // });
        // this._indicator.menu.addMenuItem(item2);

        Main.panel.addToStatusArea(Me.metadata.uuid, this._indicator);
    }

    _draw() {
        let [width, height] = this.area.get_surface_size();
        log('size', width, height);
        let cr = this.area.get_context();

        log(Clutter.Color.from_string('#ff0000')[1].constructor.name);
        Clutter.cairo_set_source_color(cr, COLOR_1);
        cr.rectangle(0, 0, width, height);
        cr.fill();

        cr.$dispose();
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
