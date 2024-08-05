#!/bin/sh
set -e

if [ "$(id -u)" = 0 ]; then
  groupmod -o -g "$DOCKER_GID" docker
fi

# Run command with node if the first argument contains a "-" or is not a system command. The last
# part inside the "{}" is a workaround for the following bug in ash/dash:
# https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=874264
if [ "${1#-}" != "${1}" ] || [ -z "$(command -v "${1}")" ] || { [ -f "${1}" ] && ! [ -x "${1}" ]; }; then
  set -- node "$@"
fi

exec runuser -u node -g node -G docker -- "$@"
