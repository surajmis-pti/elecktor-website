// PostgreSQL connection (Supabase). DATABASE_URL Vercel ke Environment Variables mein hota hai.
import pg from "pg";

// numeric (paise wale amount) ko JS number mein padho
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v))); // bigint ids

let pool;
export function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const local = /localhost|127\.0\.0\.1|host=\/|@\/|%2Ftmp/.test(url);
    pool = new pg.Pool({
      connectionString: url,
      ssl: local ? false : { rejectUnauthorized: false },
      max: 3,                       // serverless: chhota pool
      idleTimeoutMillis: 10_000,
    });
  }
  return pool;
}

export const q = (text, params) => getPool().query(text, params);

// transaction helper
export async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
