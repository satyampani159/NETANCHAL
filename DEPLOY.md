# Deploying Netanchal for free

Two parts, two homes:

| Part | Where | Why |
|---|---|---|
| **Game server** (`backend/`) | Oracle Cloud "Always Free" VM, with DuckDNS (free name) and Caddy (free HTTPS) | It must stay on 24/7. This VM never sleeps. |
| **Website** (`dist/`) | Cloudflare Pages | Free, never sleeps, free HTTPS, drag and drop. |

Free-tier rules change, so check each provider's page before you start. You do not need any programming tools on your computer: the website is already built in `dist/`.

Do the steps in this order. Part B needs the server name from Part A, and Part A needs the website address from Part B (you will come back to it once).

---

## Part A. The game server (about 20 minutes)

### A1. Make the Oracle Cloud VM
1. Sign up at oracle.com/cloud/free. Pick a home region near your players (it cannot be changed). A card is needed for identity check; Always Free resources are not charged.
2. Console, Compute, Instances, **Create instance**:
   - Image: **Ubuntu 22.04**.
   - Shape: **VM.Standard.E2.1.Micro** (Always Free, AMD, 1 GB RAM). If you see "Always Free" on the Ampere shape (VM.Standard.A1.Flex) and it lets you create it, that one is stronger.
   - Download the SSH private key when asked, and keep it safe.
3. When it is running, copy its **public IP**. Make it permanent: Networking, Reserved public IPs, reserve one and attach it.
4. Open the web ports: Networking, Virtual Cloud Networks, your VCN, Security Lists, Default, **Add Ingress Rules**: source `0.0.0.0/0`, TCP, destination port **80**; add a second rule for port **443**.

### A2. Get a free name
1. Go to duckdns.org, sign in, create a name such as `yourname` (you get `yourname.duckdns.org`).
2. Set its IP to the VM's public IP and click update.

### A3. Put the files on the VM
From the folder where you unzipped this project (Windows: use PowerShell or WSL; Mac and Linux: Terminal):
```bash
scp -i path/to/your-key.key -r backend deploy ubuntu@YOUR_VM_IP:~/
```

### A4. Install Docker (once)
```bash
ssh -i path/to/your-key.key ubuntu@YOUR_VM_IP
cd ~/deploy
bash setup.sh
exit
```
Then log in again (the same `ssh` command) so Docker works without `sudo`.

### A5. Start the server
```bash
cd ~/deploy
cp .env.example .env
nano .env
```
Set `DOMAIN` to your DuckDNS name. Leave `ALLOWED_ORIGINS` for now (you will set it in Part C). Save with Ctrl+O, Enter, Ctrl+X. Then:
```bash
docker compose up -d --build
```
After a minute open `https://yourname.duckdns.org/health` in a browser. It should show `{"ok":true,...}`. (Caddy needs ports 80 and 443 open and the name pointing at the IP to get its certificate.)

---

## Part B. The website on Cloudflare Pages (about 10 minutes)
1. Open `dist/config.js` in any text editor and put your server name in:
   ```js
   window.NETANCHAL_CONFIG = { serverUrl: "https://yourname.duckdns.org" };
   ```
   Save it.
2. Sign up at cloudflare.com (free). Dashboard, **Workers & Pages**, **Create**, **Pages**, **Upload assets**. Name the project (for example `netanchal`), then drag the whole **`dist` folder** in and deploy.
3. You get an address like `https://netanchal.pages.dev`. Open it: the page should load and the Online option should show "Server online".

To update the website later: change files, then Workers & Pages, your project, **Create new deployment**, and upload `dist/` again.

---

## Part C. Tell the server which website may connect
Without this, browsers block the connection (a "CORS" error).
```bash
ssh -i path/to/your-key.key ubuntu@YOUR_VM_IP
cd ~/deploy
nano .env
```
Set `ALLOWED_ORIGINS=https://netanchal.pages.dev` (your exact address, no trailing slash; several allowed, separated by commas, for example if you add your own domain later). Then:
```bash
docker compose up -d
```

## Test it
On your computer (Mac, Linux, WSL or Git Bash):
```bash
bash deploy/check.sh https://yourname.duckdns.org https://netanchal.pages.dev
```
It checks that the server answers, the website is allowed, other sites are not, and WebSockets work. Then open the website on two phones, choose Online, Create room on one, Join with code on the other.

## If something fails
| What you see | Likely cause and fix |
|---|---|
| `/health` does not open | VM firewall or Oracle security list: ports 80 and 443 must be open (A1 step 4 and `setup.sh`). Check the DuckDNS name points at the VM's IP. |
| Browser says certificate error | Caddy has not got its certificate yet. Run `docker compose logs caddy`. Usually ports 80/443 closed or wrong `DOMAIN`. |
| Site says "Server asleep or unreachable" | `serverUrl` in `config.js` is wrong or missing `https://`; or the server is down (`docker compose ps`). |
| Console says "blocked by CORS" | `ALLOWED_ORIGINS` does not match the website address exactly (Part C). |
| Console says "mixed content" | `serverUrl` starts with `http://`. It must be `https://` when the website is https. |
| Works, then stops after weeks | Oracle may reclaim idle free VMs. Log in now and then, and add a free uptime monitor (UptimeRobot) on `/health`. |

## Everyday commands (on the VM, in `~/deploy`)
```bash
docker compose ps            # is it running?
docker compose logs -f server  # live server log
docker compose restart       # restart everything
```
To update the server later, upload the new `backend/` folder (scp, as in A3) and run `docker compose up -d --build`.

## Notes
- The server keeps no data. Player profiles live in each player's browser.
- Free uptime monitor: add an HTTP check on `https://yourname.duckdns.org/health` every 5 minutes at uptimerobot.com so you get an email if it goes down.

---

## Part D. GitHub and automatic updates (recommended for regular changes)

With this, you edit the project, push to GitHub, and the website updates by itself in about two minutes. Use the **repository zip** (`netanchal-repo.zip`) for this part, not the frontend/backend zip.

### D1. Put the project on GitHub
1. Create a free account at github.com and click **New repository**. Name it `netanchal`, choose Private (or Public), and do **not** add a README.
2. Unzip `netanchal-repo.zip` into a folder, open a terminal there, and run (replace `YOUR-NAME`):
   ```bash
   git init -b main
   git add -A
   git commit -m "First version"
   git remote add origin https://github.com/YOUR-NAME/netanchal.git
   git push -u origin main
   ```
   (Install Git first from git-scm.com if needed. GitHub will ask you to sign in.)
3. Open the **Actions** tab on GitHub: the "Checks" workflow runs and should turn green. It tests the game rules, the server and the build on every push.

### D2. Connect Cloudflare Pages to the repository
1. Cloudflare dashboard, **Workers & Pages**, **Create**, **Pages**, **Connect to Git**, authorise GitHub and pick `netanchal`.
2. Build settings:
   - Framework preset: **None**
   - Build command: `npm ci && npm run build -w client`
   - Build output directory: `client/dist`
   - Environment variable: `NODE_VERSION` = `22`
3. **Save and Deploy.** After a couple of minutes you get your `https://....pages.dev` address. Put it in the server's `ALLOWED_ORIGINS` (Part C).

From now on, every push to the `main` branch updates the live site. Pushes to other branches and pull requests get their own preview link, so you can try a change before it goes live.

### D3. Everyday editing
- **Server address:** edit `client/public/config.js` (one line), commit, push.
- **Instagram posts:** edit `client/src/data/instagram.ts`, paste three post links into `POSTS`. You can do this right in the GitHub web editor (pencil icon), then **Commit changes**: the site updates by itself.
- **Anything else:** run it on your computer first:
  ```bash
  npm install
  npm run dev          # the website, with hot reload
  npm run rules        # game rule checks
  npm run typecheck
  ```
  Then `git add -A`, `git commit -m "what you changed"`, `git push`.
- If you change anything in `shared/` (game rules), also run `npm run build:sim` and commit `server/sim.bundle.js`. The Checks workflow tells you if you forgot.

### D4. Optional: update the game server from GitHub too
The workflow "Update the game server" copies the server to your VM and restarts it whenever `server/` or `shared/` changes on `main`. It stays idle until you add three secrets.
1. On your computer make a key made only for this: `ssh-keygen -t ed25519 -f deploy_key -N ""`
2. Add the **public** key to the VM: `ssh -i your-oracle-key ubuntu@YOUR_VM_IP "cat >> ~/.ssh/authorized_keys" < deploy_key.pub`
3. On GitHub: repository **Settings**, **Secrets and variables**, **Actions**, **New repository secret**, add:
   - `VM_HOST`: the VM's public IP
   - `VM_USER`: `ubuntu`
   - `VM_SSH_KEY`: the full contents of the **private** file `deploy_key`
4. Test: **Actions**, **Update the game server**, **Run workflow**. It should end green with "Server is healthy."
Delete the `deploy_key` files from your computer afterwards, or keep them somewhere safe. The VM must already have been set up once (Parts A and C).
