#!/usr/bin/env bash
# Copies the server (server/ -> ~/backend) and the deploy files (deploy/zip -> ~/deploy) to the VM.
# Used by the "Update the game server" workflow; set DEST to a local folder to test it without a VM.
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ -n "${DEST:-}" ]; then
  # local dry run: copy into $DEST/backend and $DEST/deploy
  mkdir -p "$DEST/backend" "$DEST/deploy"
  rsync -a --delete --exclude node_modules --exclude .env server/ "$DEST/backend/"
  rsync -a --delete --exclude .env deploy/zip/ "$DEST/deploy/"
  echo "Copied to $DEST"
  exit 0
fi

: "${VM_HOST:?VM_HOST is not set}" "${VM_USER:?VM_USER is not set}"
SSH="ssh -i $HOME/.ssh/deploy_key -o StrictHostKeyChecking=yes"
rsync -az --delete --exclude node_modules --exclude .env -e "$SSH" server/ "$VM_USER@$VM_HOST:backend/"
rsync -az --delete --exclude .env -e "$SSH" deploy/zip/ "$VM_USER@$VM_HOST:deploy/"
