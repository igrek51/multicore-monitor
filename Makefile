copy-data:
	cp /home/ireneusz/tmp/multicore-system-monitor@igrek.dev/* /home/ireneusz/.local/share/gnome-shell/extensions/multicore-system-monitor@igrek.dev/

update: copy-data
	gnome-extensions disable 'multicore-system-monitor@igrek.dev'
	gnome-extensions enable 'multicore-system-monitor@igrek.dev'

logs:
	sudo journalctl -f -o cat /usr/bin/gnome-shell

nested-wayland:
	dbus-run-session -- gnome-shell --nested --wayland

run: copy-data nested-wayland
