# Netanchal frontend

React + Phaser website and game client. Plays solo against bots in the browser, or online against the backend server.

```bash
npm install
npm run dev          # http://localhost:5173, solo vs bots
```

Online: run the backend (`../backend`, `npm start`) and start the site with its address:

```bash
VITE_SERVER_URL=http://localhost:3000 npm run dev
```

Build for hosting (Vercel, Netlify, GitHub Pages, Cloudflare Pages): `npm run build`, publish `dist/`. Set `VITE_SERVER_URL` (see `.env.example`) in the host's environment so the build knows where the backend is. On Vercel: framework Vite, build command `npm run build`, output directory `dist`.

- `src/`: screens (`app/`), landing page (`landing/`), lobby (`lobby/`), Phaser scenes (`phaser/`), network layer (`phaser/net/RoomClient.ts`), audio and character art (`assets/`).
- `shared/`: the game rules and data (characters, map, protocol, match simulation) used by both the solo mode here and the backend's `sim.bundle.js`.

`?server=https://my-server` on the page address overrides the backend for testing, and `?round=30` shortens solo rounds to 30 seconds.
