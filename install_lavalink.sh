#!/bin/sh

cd "$(dirname $0)"

curl https://github.com/Frederikam/Lavalink/releases/download/3.3.1/Lavalink.jar > Lavalink.jar

echo "WARNING: please install a Java 13 runtime and make sure Lavalink is launched with it."