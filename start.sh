#!/bin/sh

# CHANGE THIS
NEATROFF="$HOME/neatroff_make"

export PATH="$NEATROFF/bin:$PATH"
node ./index.js
