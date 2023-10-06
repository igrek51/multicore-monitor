# Create gnome extension
https://gjs.guide/extensions/development/creating.html#gnome-extensions-tool

will create in ~/.local/share/gnome-shell/extensions
/home/ireneusz/.local/share/gnome-shell/extensions/multicore-system-monitor@igrek.dev

ln -s /home/ireneusz/tmp/multicore-system-monitor@igrek.dev /home/ireneusz/.local/share/gnome-shell/extensions/multicore-system-monitor@igrek.dev

gnome-extensions create --uuid=multicore-system-monitor@igrek.dev --name=multicore-system-monitor@igrek.dev --description=multicore-system-monitor@igrek.dev
rm -rf /home/ireneusz/.local/share/gnome-shell/extensions/multicore-system-monitor@igrek.dev
cp -r /home/ireneusz/tmp/multicore-system-monitor@igrek.dev /home/ireneusz/.local/share/gnome-shell/extensions/multicore-system-monitor@igrek.dev

cp /home/ireneusz/tmp/multicore-system-monitor@igrek.dev/* /home/ireneusz/.local/share/gnome-shell/extensions/multicore-system-monitor@igrek.dev/

# Enable extension
gnome-extensions disable 'multicore-system-monitor@igrek.dev'
gnome-extensions enable 'multicore-system-monitor@igrek.dev'
gnome-extensions-app

gnome-extensions list
gnome-extensions list --enabled

# Testing
Wayland Sessions: Start a nested GNOME Shell session
dbus-run-session -- gnome-shell --nested --wayland
gnome-extensions enable 'multicore-system-monitor@igrek.dev'

# Gnome shell output
sudo journalctl -f -o cat /usr/bin/gnome-shell
sudo journalctl -o cat /usr/bin/gnome-shell
