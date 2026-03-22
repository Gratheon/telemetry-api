import createConnectionPool, { sql } from "@databases/pg";
import * as fs from "fs";
import * as crypto from "crypto";
import config from "./config";

export { sql };

let db;
export function storage() {
  return db;
}

export async function checkStorageHealth() {
  if (!db) {
    throw new Error("Database pool is not initialized");
  }
  await db.query(sql`SELECT 1`);
}

export async function initStorage(logger) {
  const dsn = `postgresql://${config.postgres.user}:${config.postgres.password}@${config.postgres.host}:${config.postgres.port}/${config.postgres.database}`;
  const startTimes = new Map<any, number>();
  let connectionsCount = 0;

  db = createConnectionPool({
    connectionString: dsn,
    bigIntMode: "number",
    poolSize: 10,
    maxUses: 7500,
    idleTimeoutMilliseconds: 60000,
    queueTimeoutMilliseconds: 60000,
    onQueryError: (query, { text }, err) => {
      startTimes.delete(query);
      logger.error(`DB error ${text} - ${err.message}`);
    },
    onQueryStart: (query) => {
      startTimes.set(query, Date.now());
    },
    onQueryResults: (query, { text }) => {
      const start = startTimes.get(query);
      startTimes.delete(query);

      if (start) {
        logger.debug(`${text.replace(/\n/g, " ").replace(/\s+/g, " ")} - ${Date.now() - start}ms`);
      } else {
        logger.debug(`${text.replace(/\n/g, " ").replace(/\s+/g, " ")}`);
      }
    },
    onConnectionOpened: () => {
      logger.info(`Opened connection. Active connections = ${++connectionsCount}`);
    },
    onConnectionClosed: () => {
      logger.info(`Closed connection. Active connections = ${--connectionsCount}`);
    },
  });

  process.once("SIGTERM", () => {
    db.dispose().catch((ex) => {
      console.error(ex);
    });
  });

  await migrate(logger);
}

async function migrate(logger) {
  try {
    await db.query(sql`
      CREATE TABLE IF NOT EXISTS _db_migrations (
        hash VARCHAR(255),
        filename VARCHAR(255),
        execution_time TIMESTAMPTZ
      );
    `);

    const files = await fs.promises.readdir("./migrations");
    const sqlFiles = files
      .filter((file) => file.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));

    for (const file of sqlFiles) {
      logger.info(`Processing DB migration ${file}`);
      const sqlStatement = await fs.promises.readFile(`./migrations/${file}`, "utf8");

      const hash = crypto
        .createHash("sha256")
        .update(sqlStatement)
        .digest("hex");

      const rows = await db.query(
        sql`SELECT * FROM _db_migrations WHERE filename = ${file} OR hash = ${hash} LIMIT 1`
      );

      if (rows.length === 0) {
        await db.tx(async (dbi) => {
          await dbi.query(sql.file(`./migrations/${file}`));
        });

        logger.info(`Successfully executed SQL from ${file}.`);
        await db.query(
          sql`INSERT INTO _db_migrations (hash, filename, execution_time) VALUES (${hash}, ${file}, NOW())`
        );
        logger.info("Successfully stored hash in _db_migrations table.");
      } else {
        logger.info(`SQL from ${file} has already been executed. Skipping.`);
      }
    }
  } catch (err) {
    logger.error(err);
    throw err;
  }
}
