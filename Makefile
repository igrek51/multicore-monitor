UUID = multicore-system-monitor@igrek.dev
EXT_DIR = ~/.local/share/gnome-shell/extensions

copy-data:
	cp extension.js $(EXT_DIR)/multicore-system-monitor@igrek.dev/
	cp metadata.json $(EXT_DIR)/multicore-system-monitor@igrek.dev/
	cp stylesheet.css $(EXT_DIR)/multicore-system-monitor@igrek.dev/

reenable:
	gnome-extensions disable '$(UUID)'
	gnome-extensions enable '$(UUID)'

update: copy-data reenable

logs:
	sudo journalctl -f -o cat /usr/bin/gnome-shell

nested-wayland:
	dbus-run-session -- gnome-shell --nested --wayland

run: copy-data nested-wayland

pack:
	gnome-extensions pack --force

install: pack
	gnome-extensions install --force $(UUID).shell-extension.zip

run-docker-xclock:
	xhost '+Local:*'
	docker buildx build -f docker/Dockerfile -t mutlicore-gnome-shell:latest .
	docker run --rm -it \
		--env="DISPLAY" \
		--net=host \
		--volume="${HOME}/.Xauthority:/root/.Xauthority:rw" \
		--user=$(shell id -u):$(shell id -g) \
		mutlicore-gnome-shell:latest \
		xclock

run-docker:
	xhost '+Local:*'
	docker buildx build \
		--build-arg UID=$(shell id -u) --build-arg GID=$(shell id -g) \
		-f docker/Dockerfile -t mutlicore-gnome-shell:latest .
	docker run --rm -it \
		--env="DISPLAY=:0" \
		--env="XDG_RUNTIME_DIR=/run/user/1001" \
		--privileged \
		--net=host \
		--volume /tmp/.X11-unix:/tmp/.X11-unix \
		--volume="${HOME}/.Xauthority:/root/.Xauthority:rw" \
		--volume="/run/user/1001:/run/user/1001" \
		--user=1001:1001 \
		mutlicore-gnome-shell:latest \
		bash
		# dbus-run-session -- gnome-shell --nested --wayland
