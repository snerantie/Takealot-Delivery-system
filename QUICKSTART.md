# Quickstart — Run the site locally

This guide gets the Takealot Delivery System running on your computer so you can
click around and test it. It takes about 10 minutes.

## What you need installed

1. **Node.js 20+** — https://nodejs.org (LTS version)
2. **Docker Desktop** — https://www.docker.com/products/docker-desktop
   (used to run the database with one command — no manual database setup)
3. **Git** — https://git-scm.com

> No Docker? You can install PostgreSQL 15 manually instead and skip step 2,
> just point `DATABASE_URL` at your own database.

---

## Step 1 — Get the code

```bash
git clone https://github.com/snerantie/Takealot-Delivery-system.git
cd Takealot-Delivery-system
```

## Step 2 — Start the database

```bash
docker compose up -d
```

This starts PostgreSQL on port 5432. (Run `docker compose ps` to confirm it's healthy.)

## Step 3 — Install dependencies

```bash
npm run install:all
```

## Step 4 — Configure environment variables

**Backend:**
```bash
cp backend/.env.example backend/.env
```
Then open `backend/.env` and set this line (the rest can stay as-is for local testing):
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/takealot_delivery?schema=public"
```

**Frontend:**
```bash
cp frontend/.env.example frontend/.env
```
The defaults work out of the box.

## Step 5 — Create the database tables and demo data

```bash
cd backend
npm run prisma:generate   # generate the database client
npm run prisma:push       # create all tables from the schema
npm run prisma:seed       # add a demo admin + driver + settings
cd ..
```

## Step 6 — Start the app

From the project root:
```bash
npm run dev
```

This starts both servers:
- **Website:** http://localhost:3000
- **API:** http://localhost:5000

Open **http://localhost:3000** in your browser. 🎉


---

## Log in with the demo accounts

| Role   | Email                              | Password    |
|--------|------------------------------------|-------------|
| Admin  | `admin@takealot-delivery.com`      | `Admin123!` |
| Driver | `driver@takealot-delivery.com`     | `Driver123!`|

## Things to try

**As the admin:**
- **Trips → New trip** — create a delivery (set payment to *Cash on delivery* to test COD)
- Assign it to the demo driver
- **Broadcasts** — send a "Payday this Friday" message to all drivers
- **COD Payments** — verify/approve driver deposits

**As the driver** (log out and log back in as the driver):
- **Trips** — open the assigned trip, mark it *Picked up*, then *Delivered*
- On a delivered COD trip, **record the cash collected**, then **record the ATM deposit**
- Watch it get verified automatically. To test the failure paths, use an ATM
  reference containing the word `MISMATCH` (amount short) or `NOTFOUND` (not found)
- Check the 🔔 **notification bell** — you'll see the broadcast and COD results

---

## Common issues

- **`docker compose` says command not found** → make sure Docker Desktop is running.
- **Port already in use** → something else is on 3000/5000/5432. Stop it, or change
  the port in `frontend/vite.config.ts` / `backend/.env`.
- **Database connection errors** → confirm the DB is up (`docker compose ps`) and that
  `DATABASE_URL` in `backend/.env` matches the compose credentials.
- **Reset everything** → `docker compose down -v` wipes the database, then repeat Step 5.

## Stopping

```bash
# Ctrl+C in the terminal running `npm run dev`, then:
docker compose down        # stop the database (keeps data)
docker compose down -v     # stop and wipe data
```
