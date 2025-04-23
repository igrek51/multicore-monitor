UUID = multicore-system-monitor@igrek.dev
EXT_DIR = ~/.local/share/gnome-shell/extensions

copy-data:
	cp extension.js $(EXT_DIR)/multicore-system-monitor@igrek.dev/
	cp metadata.json $(EXT_DIR)/multicore-system-monitor@igrek.dev/
	cp stylesheet.css $(EXT_DIR)/multicore-system-monitor@igrek.dev/

enable:
	gnome-extensions enable '${UUID}'

reenable:
	gnome-extensions disable '${UUID}'
	gnome-extensions enable '${UUID}'

update: copy-data reenable

logs:
	sudo journalctl -f -o cat /usr/bin/gnome-shell

logs-by-id:
	sudo journalctl -e -t gnome-shell

nested-wayland: copy-data
	dbus-run-session -- gnome-shell --nested --wayland

run: copy-data nested-wayland

pack:
	gnome-extensions pack --force

install: pack
	gnome-extensions install --force ${UUID}.shell-extension.zip

run-docker-xclock:
	xhost '+Local:*'
	docker buildx build \
		--build-arg UID=$(shell id -u) --build-arg GID=$(shell id -g) \
		-f docker/Dockerfile -t mutlicore-gnome-shell:latest .
	docker run --rm -it \
		--env="DISPLAY" \
		--net=host \
		--volume="${HOME}/.Xauthority:/root/.Xauthority:rw" \
		--user=$(shell id -u):$(shell id -g) \
		mutlicore-gnome-shell:latest \
		xclock

vm:
	(cd test && vagrant up)
# vagrant: vagrant
# sudo apt update
# sudo apt install gnome-shell gdm3 gnome-terminal gnome-shell-extensions gnome-shell-extension-manager gnome-tweaks nautilus xorg

vm-ssh:
	(cd test && vagrant ssh)

vm-down:
	(cd test && vagrant destroy)

vm-install: pack
	cp ${UUID}.shell-extension.zip test/
	cd test && vagrant ssh -c "gnome-extensions install --force /vagrant/${UUID}.shell-extension.zip"
	cd test && vagrant ssh -c "gnome-extensions enable '${UUID}'"
