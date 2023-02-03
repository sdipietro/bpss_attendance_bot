#!/bin/bash

now=$(date)
echo "$now" >> ~/Desktop/bpss_attendance_bot/output.txt

node ~/Desktop/bpss_attendance_bot/attendance_bot.js >> ~/Desktop/bpss_attendance_bot/output.txt

echo 'End' >> ~/Desktop/bpss_attendance_bot/output.txt
echo '' >> ~/Desktop/bpss_attendance_bot/output.txt