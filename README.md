# Netanchal

4v4 party brawler for phones. Best of 3. Whoever holds the HQ forms the government.

Implements the *Netanchal Website and Game Implementation Plan*: landing page → lobby (8s bot-fill) → fullscreen Phaser match → results, with one simulation shared by the solo Web Worker and the Socket.io server.

```
netanchal/
  shared/   characters.ts (roster + ability numbers), map.ts, protocol.ts,
            sim/ MatchSim (lobby, rounds, election swap), combat, capture, bots/behaviourTree
  client/   React 18 + Vite + Tailwind + Zustand shell, Phaser 3 scenes, PWA
  server/   standalone Express + Socket.io server (server.js) running the same MatchSim, deployable from this folder alone
  scripts/  balance.ts (bot-only win-rate check)
```

## Run

```bash
npm install
npm run dev            # client on http://localhost:5173, solo vs bots
npm run dev:server     # Socket.io server on http://localhost:3000 (run `npm install` in server/ once)
VITE_SERVER_URL=http://localhost:3000 npm run dev   # client with Online mode
npm run build:sim      # rebuild server/sim.bundle.js after changing anything in shared/
npm run e2e:socket     # end-to-end test of the server over real sockets
npm run build          # client/dist, deploy to Cloudflare Pages
npm run balance -- 200 # stage-2 exit check: no team over 55% in bot-only matches
```

`?round=30` on the URL shortens solo rounds to 30 seconds for testing.

## Rules as implemented

- **Map**: "Kartavya Path", point-symmetric, with India Gate as a landmark (not a capture point), auto-rickshaw ranks and Delhi Police barricades. Each party has a Political Tower and three home vote booths.
- **Round**: 150s. Win instantly by filling the enemy tower's capture ring (the CRPF gate in front of it must be destroyed first and no defenders can be inside). Otherwise the most votes at the buzzer wins; level votes go to whoever holds more booths, then the ruling party.
- **Votes**: a booth you hold pays a small trickle that grows the longer you keep it (0.12/s, up to double after a minute). Flipping a booth pays 15 to 70 votes on the spot, more the deeper it is in the other party's territory (so retaking your own booth is cheap), less for repeat flips of the same booth, and a freshly captured booth is harder to take back for 6 seconds (about 2.4s alone, faster with more capturers; a lone defender only slows a bigger group). Taking all three enemy booths pays a one-off +80 sweep bonus and speeds up the tower push. A KO is +8 votes (+12 if the victim was defending a booth or tower). In the last 30 seconds flips and KOs pay double. Pushing the enemy tower pays a trickle too, and a side 40+ votes behind captures 30% faster.
- **CRPF**: each booth and tower has a CRPF post. A booth's post hits intruders for 5 per shot while it is in its home party's hands, and once captured it flips sides and only hits the other team for 2.
- **Characters**: no roles. All 8 can fight alone, and every special deals damage (about 32-46) with a big visible effect: Ribbon Cutter scissors (Vikas), Bulldozer (Kila), Maach Maar fish (Toofan), Bijli Giri lightning (Bijli), Speed Breaker humps (Sadak), scroll volley (Chanakya), dictionary slam (Pandit), Dharna Quake (Dharna). Each party has exactly one ranged character (Chanakya, Bijli); the other six are melee. `npm run duel` checks every cross-party pair (target 35-65%, melee vs ranged 40-60%).
- **Healing**: standing in your own tower heals 40% of max HP per second, so going home is faster than dying (respawn is 5s).
- **Respawn**: a respawned character starts with its special ready.
- **Election swap**: the round winner becomes the ruling party: stronger gate guard (600 HP). The opposition respawns at a forward media van.
- **Lobby**: 8s ring; unpicked seats become bots ("Karyakarta N"). In solo, "I'm ready" skips the wait.
- **Controls**: WASD/arrows, Space/J or click to attack (auto-aims at the nearest enemy, mouse aims), E/K/Shift or right-click for special. Touch: a fixed joystick at bottom-left, attack and special buttons at bottom-right, vertical HP bar at your team's screen edge. The game asks for landscape and fullscreen.
- **Exit**: the DOM ✕ (and leaving fullscreen) unmounts Phaser and returns to the lobby.

## Things that differ from the plan

- Game state goes over the network as 30 Hz full snapshots (Socket.io `volatile` emits). That lets the server and the solo worker use the same MatchSim unchanged.
- The server runs a bundled copy of `shared/` (`server/sim.bundle.js`, built by `npm run build:sim` and committed) so the `server` folder deploys on its own. **Rebuild it whenever `shared/` changes.**
- The simulation lives in `shared/src/sim` instead of `server/src/sim`, which is how the plan's "shared package" option works.
- The plan says `characters.json` and the art pack were already built, but neither was in this handoff. Ability numbers live in `shared/src/characters.ts`, and character bios live in `client/src/data/characters.json`. The portraits are generated SVGs (`client/src/assets/characters/portraits.ts`), and the website and the game both use them. Swap in the real art there.
- Movement isn't predicted on the client. Positions are smoothed toward the server snapshots, which is fine in solo and on low ping. Prediction is a stage-3 job.
- Stage 4 (ranks, Hindi text, the Oracle Cloud move) isn't started.

## Working on the project

```bash
npm install            # once
npm run dev            # website with hot reload, solo vs bots
npm run dev:server     # local game server (run `npm install` in server/ once)
npm run typecheck && npm run rules && npm run progression && npm run e2e:socket
```
Edit, test, `git push`. Pushes to `main` publish the website through Cloudflare Pages; the "Checks" workflow runs the tests. After changing anything in `shared/`, run `npm run build:sim` and commit `server/sim.bundle.js`. See `DEPLOY.md` (Part D) for the GitHub setup.

## Deploying

See `DEPLOY.md` for the free setup: Oracle Always Free VM for the server and Cloudflare Pages for the website. The server address can be changed after the build in `client/public/config.js` (copied to `dist/config.js`).

## Instagram

The header has a flashing **Visit** button, the landing page has a gallery of three posts, and the footer, menu, results screen and share card link to the account. To change the account or the three posts, edit `client/src/data/instagram.ts` (paste three post or reel links into `POSTS`). Posts are Instagram's own embeds and need a normal website (they will not load in sandboxed previews); each card also has an "Open on Instagram" link.

## Profile, daily challenge, sharing and the first match

- **Guest profile** (saved in the browser only, so clearing site data resets it): name, level and XP, matches, wins, MVPs, win streak and a **daily streak** (a finished match each day; a freeze is earned at level 5). Open it from the nav button on the landing page.
- **Daily challenge:** one per day, the same for everyone, picked from the date (`client/src/game/progression.ts`). Finishing it pays +60 XP.
- **Cosmetics** (hats, name plates, banners, card frames) unlock by level, streak and challenges and never change stats. Hats and name plates show on your own character; banners and frames show on your share cards. Other players do not see them yet.
- **Share cards:** after each round and each match, one tap draws a 1080x1350 PNG in the browser and opens the phone's share sheet (or saves it and copies the link on desktops). **Invite friends** on the results screen starts a private room; with no game server configured it shares `?play=1`, which starts a bot match straight away.
- **First match:** a new profile's first match is a guided practice against easy bots (the bots hold still for 12 seconds): move, reach a booth, capture it, punch, use the special. Skip any time; "Replay the tutorial" is in the profile.
- `npm run progression` checks the XP, streak, challenge and unlock logic.

## Private rooms and sound

- **Private rooms:** on the landing page (Online mode) choose Create room, or Join with code. The lobby shows a 4-letter code with Copy link and Share (WhatsApp or the phone's share sheet). `?room=ABCD` in the URL joins directly. The host can press Start now; otherwise the room starts when everyone is ready or after 3 minutes, with bots filling empty seats. Quick Play never lands in a private room.
- **Sound:** browsers only allow audio after a tap, so the first tap anywhere unlocks it. Buttons click, scrolling ticks, carousels whoosh, and a calm menu loop plays until a match starts the full rally track. All of it is generated live with Web Audio. The speaker button in the nav and in the match mutes everything.

## Multiplayer server

`server/server.js` is an authoritative Express + Socket.io server. Clients only send intent (movement vector, attack, special, ping); the server simulates at 30 Hz, decides every hit and capture, and broadcasts snapshots to the room.

- **Rooms and matchmaking:** a new player goes to a lobby that is already filling, otherwise to a running match that has a character no human is playing, otherwise to a fresh room.
- **Joining a running match:** the newcomer sees the lobby (round, score, who is human and who is a bot) and may pick any character no other human is playing. The bot is replaced in place, with its position, HP and cooldowns kept, and the player is in the game straight away. If every seat is human they wait on the lobby screen.
- **Dropped connections:** a bot plays on and the seat is held for 30 seconds. The browser keeps a stable id, so a reload or reconnect within that time returns to the same character. **Leave** frees the seat at once.
- **Anti-cheat:** inputs are validated (types, finite numbers, allow-listed values), rate-limited per socket (a flood gets the socket disconnected), and the client never sends positions: pings use the server's own copy of the player. There is no client-side prediction yet, so your own movement shows about one round trip late.
- **Config (environment):** `PORT` (default 3000), `ALLOWED_ORIGINS` (comma list, `https://*.vercel.app` style wildcards allowed; unset = allow all), `TICK_RATE`, `SNAPSHOT_RATE`, `MAX_ROOMS`, `MAX_CONN_PER_IP`, `TRUST_PROXY=1` behind Render/Railway.
- Endpoints: `GET /health` and `GET /` (status).

## Deploy for free (multiplayer)

Three pieces: the **game server** (Render, Railway or an Oracle VM), the **website** (GitHub Pages, Vercel or similar), and one setting that joins them: `VITE_SERVER_URL`, the server's address (`https://...`; `wss://...` is accepted too).

Free-tier terms change, so check each pricing page before relying on one. At the time of writing, Render's free service sleeps after 15 minutes of inactivity and needs about a minute to wake; Oracle's Always Free VM does not sleep but needs a card and a little setup.

### 1. Put the code on GitHub
Create a repository and push this project to its `main` branch.

### 2a. Game server on Render (easiest)
1. render.com, **New > Blueprint**, pick the repository. It reads `render.yaml` and runs the `server` folder (`npm install`, then `npm start`).
2. In the service's **Environment**, set `ALLOWED_ORIGINS` to your website's address, e.g. `https://netanchal.vercel.app` (several are comma-separated).
3. Open `https://<your-service>.onrender.com/health`. You should see `{"ok":true,...}`. That address is your `VITE_SERVER_URL`.

The website calls `/health` when the landing page opens, so a sleeping server is already waking while the player reads. The lobby says so while it waits (up to 75 seconds).

### 2b. Game server on Railway
New project from the repo, set **Root Directory** to `server`, add the variables `ALLOWED_ORIGINS` and `TRUST_PROXY=1`. Railway reads `npm start` and the `PORT` it provides.

### 2c. Game server on an Oracle Cloud Always Free VM (never sleeps)
1. Create an Ubuntu VM (Always Free shape). Open ports **80 and 443** in the VCN Security List.
2. Get a free name at duckdns.org and point it at the VM's public IP.
3. On the VM: `git clone <your repo>`, then `bash deploy/oracle/setup.sh`, log out and in once.
4. `cd deploy/oracle && DOMAIN=yourname.duckdns.org ALLOWED_ORIGINS=https://your-site.vercel.app docker compose up -d --build`. Caddy gets the HTTPS certificate on its own.
5. Your server address is `https://yourname.duckdns.org`.

### 3a. Website on Vercel
Import the repository, set **Root Directory** to the repo root with build command `npm run build -w client` and output directory `client/dist`, and add the environment variable `VITE_SERVER_URL`.

### 3b. Website on GitHub Pages
1. **Settings > Pages > Source: GitHub Actions**.
2. **Settings > Secrets and variables > Actions > Variables > New variable**: name `VITE_SERVER_URL`, value your server address.
3. Push to `main` (or run the workflow by hand). `.github/workflows/pages.yml` builds and publishes the site.

The site then defaults to **Online** mode, with a Solo vs bots switch on the landing page. Without the variable it is solo-first and only tries the page's own address when you pick Online.

*Website in a different repository from the code?* Keep the workflow in the code repo, but replace the last two steps with a push of `client/dist` to the other repository (for example with `peaceiris/actions-gh-pages` and a deploy key), and set `VITE_SERVER_URL` in the code repo.

### Notes
- The website is served over HTTPS, so the server must be reachable over HTTPS too (Render, Railway and the Caddy setup all provide it).
- `?server=https://my-server` on the site's address overrides the server for testing.
- A room holds 8 people (4 per party). Extra arrivals join a new room. Empty seats are played by bots.
- The server keeps matches in memory. Restarting or redeploying it ends any match in progress.
