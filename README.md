# Skyfalke Project Execution Dashboard

Full-stack project management dashboard built with **Django REST Framework** (backend) and **React + Vite** (frontend), backed by **MongoDB Atlas**.

---

## Project Structure

```
skf-project-silas/
├── backend/    # Django REST API  → deploy to Render
└── frontend/   # React + Vite SPA → deploy to Vercel
```

---

## Backend (Render)

### Local setup
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # fill in SECRET_KEY and MONGODB_URI
python manage.py runserver 8005
```

### Render deployment
| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |
| **Build Command** | `pip install -r requirements.txt && python manage.py collectstatic --noinput` |
| **Start Command** | `gunicorn project_dashboard.wsgi --bind 0.0.0.0:$PORT --workers 2 --timeout 120` |
| **Environment** | Python 3.11 |

**Required environment variables on Render:**
- `SECRET_KEY` — long random string
- `MONGODB_URI` — MongoDB Atlas connection string
- `DEBUG` — `False`
- `FRONTEND_URL` — your Vercel deployment URL (e.g. `https://your-app.vercel.app`)

---

## Frontend (Vercel)

### Local setup
```bash
cd frontend
npm install
cp .env.example .env     # set VITE_API_URL to your backend URL
npm run dev
```

### Vercel deployment
| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Framework Preset** | Vite |

**Required environment variables on Vercel:**
- `VITE_API_URL` — your Render backend URL (e.g. `https://your-backend.onrender.com/api`)

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS v4, Recharts |
| Backend | Django 4.2, Django REST Framework, MongoEngine |
| Database | MongoDB Atlas |
| Auth | Custom JWT (PyJWT + bcrypt) |
| Deploy | Vercel (frontend) + Render (backend) |
