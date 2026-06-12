# Deploy a live, shareable version

This puts the site on the internet with a public URL — no need to run anything
on your own computer afterwards. It uses free tiers and takes ~20 minutes.

You'll deploy three pieces:
1. **Database** — free PostgreSQL on Render
2. **Backend API** — on Render (created together with the database via the blueprint)
3. **Frontend website** — on Vercel

All you need are two free accounts: **Render** (https://render.com) and
**Vercel** (https://vercel.com). Sign in to both with your GitHub account.

---

## Part 1 — Backend API + Database (Render)

1. Push this repo to GitHub (already done — it's on `main`).
2. Go to **https://dashboard.render.com** → **New +** → **Blueprint**.
3. Connect your GitHub and pick the **Takealot-Delivery-system** repo.
4. Render reads `render.yaml` and shows: a web service `takealot-api` + a database
   `takealot-db`. Click **Apply**.
5. Wait for it to build and go live (first build takes a few minutes). When done,
   copy the API URL — it looks like `https://takealot-api.onrender.com`.
6. Test it: open `https://takealot-api.onrender.com/health` — you should see
   `{"status":"ok",...}`.

### Your login accounts
The demo admin and driver accounts are created **automatically** on first deploy
(credentials below). If for some reason you can't log in, open the `takealot-api`
service → **Shell** tab and run it manually:
```bash
npm run prisma:seed
```


---

## Part 2 — Frontend website (Vercel)

1. Go to **https://vercel.com/new** and import the **Takealot-Delivery-system** repo.
2. In the project settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)
3. Add an **Environment Variable**:
   - Name: `VITE_API_URL`
   - Value: your Render API URL from Part 1 (e.g. `https://takealot-api.onrender.com`)
4. Click **Deploy**. When it finishes you get a public URL like
   `https://takealot-delivery-system.vercel.app` — **that's your live site.** 🎉

---

## Part 3 — Connect them (CORS)

1. Back in Render → `takealot-api` → **Environment**, set:
   - `FRONTEND_URL` = your Vercel URL (e.g. `https://takealot-delivery-system.vercel.app`)
2. Save — Render redeploys automatically. This lets the website talk to the API.

---

## Log in

| Role   | Email                          | Password    |
|--------|--------------------------------|-------------|
| Admin  | `admin@takealot-delivery.com`  | `Admin123!` |
| Driver | `driver@takealot-delivery.com` | `Driver123!`|

New drivers can also self-register from the site's **Register** page.

---

## Notes & gotchas

- **Free tier sleeps:** Render's free API "spins down" after inactivity, so the
  first request after a while can take ~30–60s to wake up. That's normal on free.
- **COD verification** runs on the built-in *simulated* bank provider. Use an ATM
  reference containing `MISMATCH` or `NOTFOUND` to test the failure paths.
- **Custom domain:** both Vercel and Render let you attach your own domain later.
- Prefer to just test on your own machine instead? See **QUICKSTART.md**.
