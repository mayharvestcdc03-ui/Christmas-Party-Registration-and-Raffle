# May Harvest Christmas Party Registration & Raffle Draw System

> **May Harvest Corporation — Christmas Party 2026**

A fullstack web application for employee attendance registration, master employee list validation (CSV upload/paste), manual approval, and real-time raffle draw with multi-agency filters and animated stage.

---

## 🚀 100% Ready for Online Deployment (Render.com)

1. Mag-login sa [render.com](https://render.com).
2. I-click ang **New +** > **Web Service**.
3. Piliin ang repository: `mayharvestcdc03-ui/May-Harvest-Raffle-Registration`.
4. Awtomatikong babasahin ng Render ang `render.yaml` o i-set ang:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** `Free`
5. I-click ang **Create Web Service**. Sa loob ng 1-2 minuto ay live na ang iyong URL (hal. `https://may-harvest-raffle-registration.onrender.com`)!

---

## 🛠️ Local Running

```bash
# Clone
git clone https://github.com/mayharvestcdc03-ui/May-Harvest-Raffle-Registration.git

# Navigate
cd May-Harvest-Raffle-Registration

# Start server
npm start
```
Buksan sa browser: `http://localhost:3000`

---

## ✨ Features
- **Register Tab:** Simple attendee registration matching against allowed employees by Employee ID and Agency (`MHC`, `Workbridge`, `Multi`, `Top Jinzai`, `BLGM`, `Omnichron`).
- **Allowed List Tab:** Upload or paste master employee list via CSV with security ID protection.
- **Manual Entry Tab:** Register unlisted employees with Accounting approval queue.
- **Raffle Draw Tab:** Configure custom prize sets and rounds by agency with animated stage, winner exclude options, and CSV export of all winners.
- **Real-Time Cloud Sync:** Syncs across multiple registration kiosks, mobile phones, and projector screen seamlessly via `/api/sync` and `/api/data`.
