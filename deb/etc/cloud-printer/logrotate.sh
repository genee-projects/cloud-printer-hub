#!/bin/bash

logdate=$(date +"%Y%m%d_%H%M")
olddir=/media/data/log_bak

# 删除老的
find $olddir -type f -mtime +60 -delete

# 备份
mkdir -p $olddir
tar cjf "$olddir/$logdate.tbz2" /var/log

# 清空
find /var/log -type f -exec truncate -s0 {} \;
