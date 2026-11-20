// `npm run db:schema` – db/schema.sql ko DATABASE_URL wale database par chalata hai
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { getPool } from "./db.js";

const sql = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
await getPool().query(sql);
console.log("Schema applied ✔");
await getPool().end();
