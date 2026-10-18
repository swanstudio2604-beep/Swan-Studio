# Swan Studio 🦢
> **Every Stitch Tells a Story.**  
> Handmade crochet creations, floral bouquets, plushies, and personalized gifts by **Bhumika Nama** in India.

---

## 🌐 Live Deployments

| Component | Platform | Live URL | Status |
|---|---|---|---|
| **Frontend** | GitHub Pages | [https://swanstudio2604-beep.github.io/Swan-Studio/](https://swanstudio2604-beep.github.io/Swan-Studio/) | 🟢 Active |
| **Backend API** | Render / Local | [https://swan-studio-api.onrender.com/](https://swan-studio-api.onrender.com/) | 🟢 Configured |
| **Backend Health** | Render / Local | [https://swan-studio-api.onrender.com/health](https://swan-studio-api.onrender.com/health) | 🩺 Health Check |
| **Repository** | GitHub | [https://github.com/swanstudio2604-beep/Swan-Studio](https://github.com/swanstudio2604-beep/Swan-Studio) | 📦 Public |

---

## 📖 Project Overview

Swan Studio is a production-grade, artisanal e-commerce atelier built for **Bhumika Nama**, combining:
1. **Artisanal Portfolio & Storefront:** An editorial visual showcase of handmade crochet with live search, collection filtering, bag management, coupon discounts, and manual UPI checkout.
2. **Customer Portal:** Order tracking, real-time fulfillment stages, UPI transaction reference (UTR) submission, and profile management.
3. **Admin Atelier Operating System:** Dedicated, role-guarded management portal (`/admin`) for products, collections, inventory, manual UPI payment verification with immutable audit logging, promo coupons, bespoke custom commission pipeline, and dynamic storefront content.
4. **DevOps & Backend Service:** Node.js Express API service with automated CI/CD via GitHub Actions and Render infrastructure-as-code (`render.yaml`).

---

## 🛠️ Technology Stack

- **Frontend:** Vanilla HTML5, CSS3, Modern ES JavaScript. Zero heavy frontend frameworks, zero build tools, fast loading and clean vanilla structure.
- **Backend Service:** Node.js, Express, CORS, Dotenv. Health check endpoint at `/health`.
- **Frontend Hosting:** GitHub Pages with automated GitHub Actions CI/CD workflow (`.github/workflows/deploy.yml`).
- **Backend Hosting:** Render / Railway via `render.yaml`.
- **Database & Security (Optional):** Supabase Free-Tier (PostgreSQL, Row Level Security with Default Deny, Database Roles, Secure PL/pgSQL RPC Functions).
- **Payment Gateway:** Manual UPI transfers (`9509966512@fam`) verified by the studio owner against her bank account before marking orders as confirmed.
- **Offline / Local Demo Mode:** If Supabase credentials are not configured in `js/supabase.js`, all systems automatically run a seamless local simulation using `localStorage` and `sessionStorage`.

---

## 🔐 Environment Variables

| Variable | Description | Default / Example | Required |
|---|---|---|---|
| `PORT` | HTTP port for Node.js Express server | `4000` (Local) / `10000` (Render) | Yes |
| `NODE_ENV` | Runtime environment mode | `production` / `development` | Yes |
| `CORS_ORIGIN` | Allowed origins for CORS | `https://swanstudio2604-beep.github.io` | Yes |
| `STORE_UPI_ID` | Store owner's UPI ID for payments | `9509966512@fam` | Yes |
| `STORE_WHATSAPP` | Customer care WhatsApp number | `9509966512` | Yes |
| `STORE_EMAIL` | Official studio communication email | `swanstudio2604@gmail.com` | Yes |
| `SUPABASE_URL` | Supabase project URL (if connected) | `https://your-project.supabase.co` | Optional |
| `SUPABASE_ANON_KEY` | Public publishable anon key | `eyJh...` | Optional |

---

## 💻 Local Setup & Development

### 1. Prerequisites
- Node.js (v18+)
- Git & GitHub CLI (`gh`)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/swanstudio2604-beep/Swan-Studio.git
cd Swan-Studio

# Install backend dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 3. Run Locally
```bash
# Start backend and serve frontend together
npm start
```
- Open **http://localhost:4000** in your browser.
- Health check available at **http://localhost:4000/health**.
- Admin atelier available at **http://localhost:4000/admin/**.

---

## 🚀 Deployment Instructions

### Frontend (GitHub Pages)
1. Pushes to the `main` branch automatically trigger the GitHub Actions workflow (`.github/workflows/deploy.yml`).
2. The workflow packages all static HTML/CSS/JS assets and deploys them to GitHub Pages.
3. Access at `https://swanstudio2604-beep.github.io/Swan-Studio/`.

### Backend (Render Deployment)
1. Sign in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** &rarr; **Blueprint**.
3. Connect your repository `swanstudio2604-beep/Swan-Studio`.
4. Render automatically reads `render.yaml` and deploys `swan-studio-api`.
5. Add the environment variables specified above in the Render service dashboard.

---

## 👑 Admin Elevation (Bhumika Nama)

Security Principle: Admin roles are NEVER granted by the client. The database role in `public.profiles` dictates authorization.

1. Bhumika signs up at `/signup.html` (or on the deployed site) using her email:  
   `swanstudio2604@gmail.com`
2. In the Supabase SQL Editor, run this command to elevate her to administrator:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'swanstudio2604@gmail.com';
   ```
3. Bhumika can now access `/admin/` and manage the entire atelier. Regular customer accounts and unauthenticated visitors are automatically blocked and redirected to `login.html`.

---

## 🔒 Mandatory Non-Negotiables Built into Code

1. **Exact Developer Credit:** `Developed with ❤️ by Mridul` is rendered dynamically at the base of the footer on every public page and admin page.
2. **Zero AI Integration:** No AI chatbots or automated conversational agents.
3. **No Secrets in Frontend:** Only the public project URL and publishable anon key are ever used in browser JavaScript.
4. **Manual UPI Only:** Payments are made to `9509966512@fam` and initially set to `PENDING_VERIFICATION`. Only Bhumika can transition them to `PAID` after verifying funds in her bank account.
5. **Strict Availability & Stock Guards:** Products marked Out of Stock (`stock <= 0`) or disabled/deleted by admin are prevented from being ordered.

---

**Crafted with care for Bhumika Nama & Swan Studio.**  
*DevOps & Fullstack Architecture by Mridul.*
