#!/usr/bin/env bash
# Tests a deployed (or local) game server from your own computer.
# Usage:  bash check.sh https://yourname.duckdns.org https://your-site.pages.dev
SERVER="${1:?usage: check.sh SERVER_URL SITE_ORIGIN}"
ORIGIN="${2:?usage: check.sh SERVER_URL SITE_ORIGIN}"
SERVER="${SERVER%/}"; ORIGIN="${ORIGIN%/}"
fail=0
ok()  { echo "PASS  $1"; }
bad() { echo "FAIL  $1"; fail=1; }

body=$(curl -fsS --max-time 15 "$SERVER/health" 2>/dev/null) && echo "$body" | grep -q '"ok":true' && ok "server answers /health" || bad "server does not answer /health (is the VM up, DNS correct, ports 80 and 443 open?)"

hdr=$(curl -sS --max-time 15 -i -H "Origin: $ORIGIN" "$SERVER/health" 2>/dev/null | tr -d '\r')
echo "$hdr" | grep -qi "^access-control-allow-origin: $ORIGIN\$" && ok "CORS allows $ORIGIN" || bad "CORS does not allow $ORIGIN (fix ALLOWED_ORIGINS on the server and restart it)"

bad_hdr=$(curl -sS --max-time 15 -i -H "Origin: https://not-allowed.example" "$SERVER/health" 2>/dev/null | tr -d '\r')
echo "$bad_hdr" | grep -qi "^access-control-allow-origin: https://not-allowed.example" && bad "CORS allows any site (ALLOWED_ORIGINS is too open)" || ok "other sites are not allowed"

poll=$(curl -sS --max-time 15 -H "Origin: $ORIGIN" "$SERVER/socket.io/?EIO=4&transport=polling" 2>/dev/null)
echo "$poll" | grep -q '"sid"' && ok "Socket.io handshake works" || bad "Socket.io handshake failed"

code=$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' -H "Origin: $ORIGIN" -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' "$SERVER/socket.io/?EIO=4&transport=websocket" 2>/dev/null)
[ "$code" = "101" ] && ok "WebSocket upgrade works (101)" || bad "WebSocket upgrade failed (got HTTP $code)"

case "$SERVER" in http://*) echo "NOTE  $SERVER is not https: an https website cannot connect to it";; esac
[ $fail = 0 ] && echo "All good." || echo "Some checks failed."
exit $fail
