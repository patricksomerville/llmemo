#!/bin/bash
# Run this to generate PNG icons from SVG
# Requires: brew install librsvg

rsvg-convert -w 16 -h 16 icon.svg > icon16.png
rsvg-convert -w 48 -h 48 icon.svg > icon48.png
rsvg-convert -w 128 -h 128 icon.svg > icon128.png

echo "Icons generated!"
