// Local development: `npm run dev` -> API http://localhost:3001 (Vite /api ko yahan proxy karta hai)
import "dotenv/config";
import app from "./app.js";

const port = process.env.API_PORT || 3001;
app.listen(port, () => console.log(`ELECKTOR API running on http://localhost:${port}`));
