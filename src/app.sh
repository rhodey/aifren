#!/bin/sh
set -e

cd /app && node app.js "$@"
