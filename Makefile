copy-data:
	cp extension.js ~/.local/share/gnome-shell/extensions/multicore-system-monitor@igrek.dev/
	cp metadata.json ~/.local/share/gnome-shell/extensions/multicore-system-monitor@igrek.dev/
	cp stylesheet.css ~/.local/share/gnome-shell/extensions/multicore-system-monitor@igrek.dev/

reenable:
	gnome-extensions disable 'multicore-system-monitor@igrek.dev'
	gnome-extensions enable 'multicore-system-monitor@igrek.dev'

update: copy-data reenable

logs:
	sudo journalctl -f -o cat /usr/bin/gnome-shell

nested-wayland:
	dbus-run-session -- gnome-shell --nested --wayland

run: copy-data nested-wayland

pack:
	gnome-extensions pack --force
