// scripts/run-migrate.ts
import "dotenv/config";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL must be set");

(async () => {
  // Mask password in logs
  const masked = url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@");
  console.log("[migrate] Using:", masked);

  // Decide driver based on URL (same heuristic as server/db.ts)
  const useNeonHttp = /neon\.tech|sslmode=require|pooler/.test(url);

  if (useNeonHttp) {
    // ---- Neon HTTP migrator ----
    const { drizzle } = await import("drizzle-orm/neon-http");
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    const { neon } = await import("@neondatabase/serverless");

    const sql = neon(url);
    const db = drizzle(sql);
    await migrate(db, { migrationsFolder: "./drizzle" });

    // Quick connectivity check (optional)
    await sql`select 1`;
    console.log("✅ Migrations complete (Neon HTTP)");
  } else {
    // ---- node-postgres migrator (local dev) ----
    const pg = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");

    const pool = new pg.Pool({ connectionString: url });
    const db = drizzle(pool);
    try {
      await migrate(db, { migrationsFolder: "./drizzle" });
      await pool.query("select 1");
      console.log("✅ Migrations complete (node-postgres)");
    } finally {
      await pool.end();
    }
  }
})();
