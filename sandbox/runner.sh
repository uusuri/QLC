#!/usr/bin/env bash

set -u -o pipefail

readonly SOURCE_FILE="/request/Main.cpp"
readonly INPUT_FILE="/request/input.txt"
readonly EXECUTABLE_FILE="/work/main"
readonly WALL_TIME_LIMIT_SECONDS="${QLC_WALL_TIME_LIMIT_SECONDS:-3}"

if [[ ! -f "$SOURCE_FILE" ]]; then
  echo "Runner input is missing: $SOURCE_FILE" >&2
  exit 30
fi

if [[ ! -f "$INPUT_FILE" ]]; then
  echo "Runner input is missing: $INPUT_FILE" >&2
  exit 30
fi

if ! g++ -std=c++23 -O2 -pipe "$SOURCE_FILE" -o "$EXECUTABLE_FILE"; then
  exit 10
fi

timeout --foreground --signal=KILL \
  "${WALL_TIME_LIMIT_SECONDS}s" \
  /usr/local/bin/qlc-sandbox "$EXECUTABLE_FILE" <"$INPUT_FILE"
execution_status=$?

if [[ $execution_status -eq 124 || $execution_status -eq 137 ]]; then
  exit 21
fi

if [[ $execution_status -ne 0 ]]; then
  exit 20
fi

exit 0
