# ELECKTOR INDUSTRIES – Website (v2)

Power cord manufacturer, Sonipat, Haryana — **https://elecktor.in**

| Part | Tech | Kahan |
|---|---|---|
| Website + Admin Console | React (Vite) | `src/` |
| Backend API | Node.js + Express | `server/app.js` (Vercel par `api/index.js` se chalta hai) |
| Database | PostgreSQL (Supabase) | tables: `db/schema.sql` |
| Product photos | Supabase Storage (bucket `products`) | `server/storage.js` |
| Hosting | Vercel (free) | `vercel.json` |

## Pages
- `/` – public website: Products (length + quantity se order), Factory, Process, About, FAQ, Contact form, Track Order
- `/admin` – Admin Console: Dashboard, Orders (Accept & Confirm → Dispatched → Completed), Products (single add/edit + photo), Bulk Upload (Excel/CSV), Enquiries, Settings (password change)

## Order flow
Client order bhejta hai → Order ID milta hai (ELK-1001), status **New** → Admin → Orders → final amount + customer message → **Accept & Confirm** → **Dispatched** → **Completed**. Client "Track Order" mein Order ID + mobile se status dekhta hai. Rate hamesha database se lagta hai, browser se nahi.

## Database tables
`products`, `product_variants` (length + price), `orders`, `order_items`, `order_status_history`, `enquiries`, `admins`, `login_attempts`

## Environment variables (Vercel → Project → Settings → Environment Variables)
| Name | Kya hai |
|---|---|
| `DATABASE_URL` | Supabase → Connect → **Transaction pooler** connection string (port 6543) |
| `JWT_SECRET` | lamba random text (admin login token sign karne ke liye) |
| `SETUP_KEY` | pehla admin account banane ki key (sirf ek baar kaam aati hai) |
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API → `service_role` key (sirf server par) |

## Pehli baar setup
1. Supabase → SQL Editor → `db/schema.sql` paste karke **Run**.
2. Vercel par env variables daal kar deploy.
3. `https://elecktor.in/admin` kholo → Setup key + apna password → admin account ban jayega.

## Local par chalana
```bash
npm install
cp .env.example .env      # values bharo
npm run dev               # website http://localhost:5173, API http://localhost:3001
```

## Contact details badalna
`src/config.js` – phone, email, location, hours, price dikhana hai ya nahi.
