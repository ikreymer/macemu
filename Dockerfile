# from https://github.com/benletchford/macemu/blob/ben/Dockerfile

FROM ubuntu:xenial

RUN DEBIAN_FRONTEND=noninteractive apt-get -y update
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y git libsdl1.2-dev autoconf libgtk2.0-dev libxxf86dga-dev libxxf86vm-dev libesd0-dev xserver-xorg-core xserver-xorg-input-all xserver-xorg-video-fbdev

RUN git clone --depth=1 https://github.com/emscripten-core/emsdk.git emsdk
RUN cd /emsdk && ./emsdk install sdk-fastcomp-1.37.40-64bit && ./emsdk activate sdk-fastcomp-1.37.40-64bit

COPY . /macemu
SHELL ["/bin/bash", "-c"]
RUN source /emsdk/emsdk_env.sh \
    && export EMSCRIPTEN=/emsdk/emscripten/1.37.40 \
    && emcc --version \
    && cd /macemu/BasiliskII/src/Unix \
    && /macemu/BasiliskII/src/Unix/_embuild.sh \
    && make clean \
    && make \
    && /macemu/BasiliskII/src/Unix/_emafterbuild.sh

RUN groupadd -r basiliskii -g 1000
RUN useradd -r -u 1000 -g basiliskii basiliskii

USER basiliskii

CMD "cd /macemu/BasiliskII/src/Unix && python -m SimpleHTTPServer"
