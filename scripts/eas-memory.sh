#!/bin/sh
# Memory log for EAS Android builds (DEC-052). `start` (from the eas-build-post-install hook) samples
# free memory and the largest processes every 20 seconds while Gradle runs; `report` (from the
# eas-build-on-error hook) prints the end of the log, so a killed build shows what used the memory.
# Does nothing outside EAS.
LOG=/tmp/mesh-radar-memory.log

sample() {
  echo "== $(date -u +%H:%M:%S) $(free -m | awk 'NR==2 { print "used " $3 " MB of " $2 " MB, available " $7 " MB" }')"
  ps -eo rss=,comm= --sort=-rss | head -n 6 | awk '{ printf "   %6d MB %s\n", $1 / 1024, $2 }'
}

case "$1" in
  start)
    [ -n "$EAS_BUILD" ] || exit 0
    command -v free >/dev/null 2>&1 || exit 0
    if command -v setsid >/dev/null 2>&1; then
      setsid nohup sh "$0" loop >"$LOG" 2>&1 &
    else
      nohup sh "$0" loop >"$LOG" 2>&1 &
    fi
    echo "eas-memory: sampling every 20 s into $LOG"
    ;;
  loop)
    while true; do
      sample
      sleep 20
    done
    ;;
  sample)
    sample
    ;;
  report)
    [ -f "$LOG" ] || exit 0
    echo "eas-memory: last samples before the failure"
    tail -n 140 "$LOG"
    ;;
esac
exit 0
