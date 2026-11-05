#!/bin/sh
set -eu
base64 -w0 /tmp/protrack-upt-tests.tar.gz | qm guest exec 210 --pass-stdin 1 -- sh -c 'base64 -d > /tmp/protrack-upt-tests.tar.gz'
