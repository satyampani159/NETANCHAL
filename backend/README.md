# Netanchal backend

Authoritative multiplayer server: Express + Socket.io, plain Node.js (>= 18).

```bash
npm install
npm start            # http://localhost:3000  (health check: /health)
```

Deploy from this folder on Render or Railway: build command `npm install`, start command `npm start`, root directory = this folder. Set the variables from `.env.example` in the host's dashboard. `ALLOWED_ORIGINS` must contain your website's address.

- `server.js`: the server (rooms, matchmaking, input validation and rate limits, CORS, reconnect grace, joining a match that is already running).
- `sim.bundle.js`: the game rules, built from `../frontend/shared`. Rebuild it after changing the rules: `npm install` then `npm run build:sim`. Frontend and backend must use the same rules, so rebuild whenever `frontend/shared` changes.
- `Dockerfile`: `docker build -t netanchal-server . && docker run -p 3000:3000 netanchal-server`.

Notes: matches live in server memory (a restart ends running games). Free hosts that sleep when idle make the first player wait up to a minute.
