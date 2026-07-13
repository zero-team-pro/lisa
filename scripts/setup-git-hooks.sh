#!/bin/sh
set -eu

repo_root=$(git rev-parse --show-toplevel)
git config core.hooksPath .githooks

echo "Git hooks enabled from $repo_root/.githooks"
