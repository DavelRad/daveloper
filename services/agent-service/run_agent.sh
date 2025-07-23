#!/bin/bash
# Helper script to run the Davel Agent Service with correct PYTHONPATH
# PYTHONPATH=./app:./generated python3 dnjwakndwa

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHONPATH="$SCRIPT_DIR/app:$SCRIPT_DIR/generated" python3 -m app.main 