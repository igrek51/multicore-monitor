UUID = multicore-system-monitor@ihiroky.github.com
BUNDLE = $(UUID).shell-extension.zip
EXT_DIR = ~/.local/share/gnome-shell/extensions

copy-data: extension.js metadata.json stylesheet.css
	mkdir -p          $(EXT_DIR)
	cp extension.js   $(EXT_DIR)
	cp metadata.json  $(EXT_DIR)
	cp stylesheet.css $(EXT_DIR)

reenable:
	gnome-extensions disable '$(UUID)'
	gnome-extensions enable  '$(UUID)'

update: copy-data reenable

logs:
	sudo journalctl -f -o cat /usr/bin/gnome-shell

nested-wayland:
	dbus-run-session -- gnome-shell --nested --wayland

run: copy-data nested-wayland

$(BUNDLE): copy-data
	gnome-extensions pack --force

install: $(BUNDLE)
	gnome-extensions install --force $(BUNDLE)
