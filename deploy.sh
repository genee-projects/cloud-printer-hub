#!/bin/bash
set -e -u
ROOT=$1
cp -r deb/etc/* ${ROOT}/etc/

# bbb新系统对cron权限要求比较严格
chown root:root ${ROOT}/etc/cron.d/cloud-printer
chmod 0600 ${ROOT}/etc/cron.d/cloud-printer

