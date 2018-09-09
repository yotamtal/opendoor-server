#!/bin/sh
# A script for access console and log the output.
# A script for access console and log the output.
# Usage:
# $ DEVICE=/dev/ttyUSB0 SPEED=51200 kermit.sh
#
# Copyright (c) Rex Tsai <chihchun@kalug.linux.org.tw>
# $Id: $

# SPEED=9600
# SPEED=38400
# SPEED=115200
CFGFILE=$(mktemp /tmp/kermit-cfg.XXXXXX)
LOGFILE=$(mktemp /tmp/kermit-log.XXXXXX)

cat > ${CFGFILE} <<EOF
log session ${LOGFILE}
set line /dev/ttyACM0
set modem type usrobotics
SET CARRIER-WATCH OFF
CONNECT
EOF

# AT COMMANDS NOTE
##################
# ATS7=6  //reset line
# OK
# ATDP551  // open the door
# BUSY

# Detect distinctive ring AT command
# AT+VDR=1,4


# Door ring
# 6 lines of DR
#################
# DROF=38
# DRON=3
# DROF=2
# DRON=3
# DROF=2
# DRON=4
# RING

# Regular ring
# 2 lines of DR
###################
# DROF=38
# DRON=14
# RING

/usr/bin/kermit ${CFGFILE}
# we don't need to config file anymore, 
# since it's created dynamicly.
rm ${CFGFILE}
# After you quit kermit by Ctrl-\ + Ctrl-C (defalut seeting)
# We tell the user which file is the log file.
echo "Session Log file: ${LOGFILE}"
# rm ${LOGFILE}

