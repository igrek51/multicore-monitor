# Creating gnome extension
https://gjs.guide/extensions/development/creating.html#gnome-extensions-tool

will create in ~/.local/share/gnome-shell/extensions
~/.local/share/gnome-shell/extensions/multicore-system-monitor@igrek.dev

ln -s ~/tmp/multicore-system-monitor@igrek.dev ~/.local/share/gnome-shell/extensions/multicore-system-monitor@igrek.dev

gnome-extensions create --uuid=multicore-system-monitor@igrek.dev --name=multicore-system-monitor@igrek.dev --description=multicore-system-monitor@igrek.dev

# Enable extension
gnome-extensions disable 'multicore-system-monitor@igrek.dev'
gnome-extensions enable 'multicore-system-monitor@igrek.dev'
gnome-extensions-app

gnome-extensions list
gnome-extensions list --enabled

# Testing in nested Wayland session
dbus-run-session -- gnome-shell --nested --wayland

# Gnome shell output
sudo journalctl -o cat /usr/bin/gnome-shell
sudo journalctl -f -o cat /usr/bin/gnome-shell

# Docs
St: https://gjs-docs.gnome.org/st13~13/
