FROM ubuntu:24.04
RUN apt-get update -y && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    gnome-shell \
    x11-apps &&\
    rm -rf /var/lib/apt/lists/*

RUN apt-get update -y && apt install -y dbus-x11

ARG UNAME=me
ARG UID=1000
ARG GID=1000
RUN groupadd -g $GID -o $UNAME
RUN useradd -m -u $UID -g $GID -o -s /bin/bash $UNAME
USER $UNAME

CMD "/usr/bin/dbus-run-session -- gnome-shell --nested --wayland"
