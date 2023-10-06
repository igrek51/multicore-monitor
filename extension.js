const GETTEXT_DOMAIN = 'my-indicator-extension';

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
        this._indicator = new PanelMenu.Button(0.0, Me.metadata.name, false);
        
        // Add an icon
        const icon = new St.Icon({
            icon_name: 'face-laugh-symbolic',
            style_class: 'system-status-icon',
        });
        this._indicator.add_child(icon);

        let item = new PopupMenu.PopupMenuItem(_('Notify'));
        item.connect('activate', () => {
            Main.notify(_('notification'));
        });
        this._indicator.menu.addMenuItem(item);

        let item2 = new PopupMenu.PopupMenuItem(_('Prefs'));
        item2.connect('activate', () => {
            ExtensionUtils.openPrefs()
        });
        this._indicator.menu.addMenuItem(item2);

        // // Add the indicator to the panel
        Main.panel.addToStatusArea(Me.metadata.uuid, this._indicator);
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
