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
Supabase → Integrations → **Vercel** se project jodne par ye apne aap aa jaate hain:
`POSTGRES_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`.

Sirf ek variable khud banana hai:
| Name | Kya hai |
|---|---|
| `SETUP_KEY` | pehla admin account banane ki key – apni marzi ka secret text (sirf ek baar kaam aata hai) |

(Optional overrides: `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_SERVICE_KEY`.)

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
