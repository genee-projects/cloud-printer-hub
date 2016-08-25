#!/bin/bash

# 开启监控进程
service monit start

# 强制 monit 做检查, monit 会开启其他进程
monit validate

