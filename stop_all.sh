#!/bin/bash

service monit stop
service gstation-mount-serial stop
service gstation-router stop
service gstation-web stop

#子进程有可能还在 

ps aux | grep -F 'gs:' | grep -v grep | awk '{print $2}' | \
    while read pid; do
        kill $pid
    done
