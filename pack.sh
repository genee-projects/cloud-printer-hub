#!/bin/sh
set -e -u
cd ..
tar -zcpf cloud-printer-${1}.tar.gz  cloud-printer node_modules --exclude .git

