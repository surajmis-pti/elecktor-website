# ELECKTOR INDUSTRIES – Website

Power cord manufacturer, Sonipat, Haryana. Ye pura website **ek hi file** (`index.html`) mein hai. Isme factory photos aur admin console bhi andar hain, bilkul PTI attendance kiosk jaisa.

- Website: `https://<github-id>.github.io/<repo>/`
- Admin Console: website ke end mein **Staff login** link, ya URL ke aage `#admin`
- Backend: `Code.gs` (Google Apps Script + Google Sheet)

## 1. GitHub par publish (attendance jaisa)
1. GitHub → **New repository** → naam `elecktor-website` → **Public** → Create.
2. **Add file → Upload files** → `index.html` aur `README.md` drag karo → Commit. `Code.gs` bhi daal sakte ho, website par uska koi asar nahi.
3. **Settings → Pages** → Source: *Deploy from a branch* → Branch `main` / `(root)` → Save.
4. 1–2 minute baad link aa jayega: `https://<github-id>.github.io/elecktor-website/`

Update karna ho to nayi `index.html` usi tarah upload karke purani file replace kar do.

## 2. Backend (orders aur products asli mein save hon)
Jab tak `API_URL` khaali hai, site **DEMO MODE** mein chalti hai. Upar peeli patti dikhti hai, data sirf usi browser mein save hota hai, aur demo admin password `elecktor@123` hai.

1. admin@elecktor.in se naya Google Sheet banao: **ELECKTOR Website Data**.
2. **Extensions → Apps Script** → `Code.gs` ka poora code paste karke Save.
3. Function **setup** → Run → Allow. Isse Products, Orders aur Enquiries tabs ban jaate hain aur 3 products aa jaate hain.
4. **Project Settings → Script properties** mein ye do daalo:
   - `ADMIN_PASSWORD`: apna strong password
   - `NOTIFY_EMAIL`: `sales@elecktor.in` (naye order aur enquiry ka mail yahan aayega)
5. **Deploy → New deployment → Web app** → Execute as: *Me* → Who has access: *Anyone* → Deploy → URL copy karo.
6. `index.html` ke upar `ELK_CONFIG` mein `API_URL: "yahan-url"` daalo → GitHub par dobara upload karo.
7. `Code.gs` mein kuch badlo to **Deploy → Manage deployments → Edit → New version** karo. URL wahi rahega.

## 3. Order flow
Client order bhejta hai → use Order ID milta hai (ELK-1001), status **New** → aapko mail aata hai → Admin → Orders → final amount bharo → **Accept & Confirm** → **Dispatched** → **Completed**. Client "Track Order" mein status dekh sakta hai.

## 4. Products
- **Single:** Admin → Products → + Add product (photo ke saath).
- **Bulk:** Admin → Bulk Upload → Excel ya CSV. Lengths ka format: `2 m:71.26 | 2.5 yard:80.17 | 3 m:92.54`
- Phone, email, price dikhana hai ya nahi: `index.html` ke upar `ELK_CONFIG` mein badlo.

## 5. elecktor.in se jodna (baad mein)
Repo **Settings → Pages → Custom domain** mein `elecktor.in` daalo. GoDaddy DNS mein GitHub ke 4 A records aur `www` ka CNAME add karo. Google Workspace ke MX, SPF aur DKIM records ko mat chhedna.
