# Yeshwanth Gowda V - Personal Brand Website

3-page full-stack site (Node.js + Express backend, static HTML/CSS/JS frontend).

Pages: Home (`/`), Expertise & Work (`/expertise`), Book a Call (`/book`).

## Run locally
```bash
npm install
cp .env.example .env     # then fill SMTP_PASS (Gmail App Password)
npm start                # http://localhost:3000
```

## Email setup (so bookings reach your inbox)
1. Google Account > Security > turn on 2-Step Verification.
2. Create an **App Password** and paste it as `SMTP_PASS` in `.env`.
3. Bookings are always saved to `data/bookings.json`; emails go to `OWNER_EMAIL`.

## Deploy
Needs a Node host (Render, Railway, Fly.io, VPS). Build: `npm install`, Start: `npm start`,
set env vars `SMTP_USER`, `SMTP_PASS`, `OWNER_EMAIL`. (GitHub Pages cannot run the backend.)

## Push to GitHub
```bash
git init && git add . && git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```
