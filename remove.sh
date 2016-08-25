#!/bin/bash
set -e -u
ROOT=$1
find deb/etc -type f | sed "s|deb/etc|${ROOT}/etc|" | xargs sudo rm
