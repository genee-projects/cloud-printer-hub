#!/bin/bash

pattern="cloud-printer"

echo "====== $(date)"

/sbin/initctl list | grep $pattern | while read service status; do
    echo "* $service is $status"
    # 如果进程在运行, 则重启
    if [[ $status =~ "running" ]]; then
        /sbin/stop $service
        /sbin/start $service
    fi
done
