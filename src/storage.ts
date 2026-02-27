import createConnectionPool, {sql, SQLQuery} from "@databases/mysql";
import * as fs from "fs";
import * as crypto from "crypto";
import config from "./config";

export { sql };

let db;
export function storage() {
  return db;
}

export async function initStorage(logger) {
  const dsn = `mysql://${config.mysql.user}:${config.mysql.password}@${config.mysql.host}:${config.mysql.port}/`

  // Try to create database using root credentials if available
  // This handles cases where the regular user doesn't have CREATE DATABASE privileges
  const rootUser = config.mysql.rootUser;
  const rootPassword = config.mysql.rootPassword;

  if (rootUser && rootPassword) {
    const rootDsn = `mysql://${rootUser}:${rootPassword}@${config.mysql.host}:${config.mysql.port}/`;
    const rootConn = createConnectionPool(rootDsn);

    try {
      await rootConn.query(sql`CREATE DATABASE IF NOT EXISTS ${sql.ident(config.mysql.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`);
      logger.info(`Database '${config.mysql.database}' created or already exists`);

      // Grant all privileges on the database to the regular user
      await rootConn.query(sql`GRANT ALL PRIVILEGES ON ${sql.ident(config.mysql.database)}.* TO ${sql.ident(config.mysql.user)}@'%'`);
      await rootConn.query(sql`FLUSH PRIVILEGES`);
      logger.info(`Granted all privileges on '${config.mysql.database}' to '${config.mysql.user}'`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.warn(`Could not create database with root user: ${errorMessage}. Will try with regular user.`);
    }

    await rootConn.dispose();
  }

  // Also try with regular user (for backward compatibility)
  const conn = createConnectionPool(dsn);
  try {
    await conn.query(sql`CREATE DATABASE IF NOT EXISTS ${sql.ident(config.mysql.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`);
    logger.info(`Database '${config.mysql.database}' created or already exists (regular user)`);
  } catch (err) {
    // Log but don't fail - database might already exist or be created by init script
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.warn(`Could not create database '${config.mysql.database}' with regular user: ${errorMessage}. Assuming it already exists.`);
  }

  // Dispose of the temporary connection pool to prevent connection leaks
  await conn.dispose();
  
  const startTimes = new Map<SQLQuery, number>();
  let connectionsCount = 0;

  db = createConnectionPool({
    connectionString: `${dsn}${config.mysql.database}`,
    // Connection pool configuration to prevent "packets out of order" warnings
    poolSize: 10, // Maximum number of connections in the pool
    idleTimeoutMilliseconds: 60_000, // Keep idle connections for 60s (increased from default 30s)
    queueTimeoutMilliseconds: 60_000, // Wait up to 60s for a connection from the pool
    acquireLockTimeoutMilliseconds: 60_000, // Wait up to 60s for connection locks
    onQueryError: (query, { text }, err) => {
      startTimes.delete(query);
      logger.error(
        `DB error ${text} - ${err.message}`
      );
    },

    onQueryStart: (query) => {
      startTimes.set(query, Date.now());
    },
    onQueryResults: (query, {text}, results) => {
      const start = startTimes.get(query);
      startTimes.delete(query);

      if (start) {
        logger.debug(`${text.replace(/\n/g," ").replace(/\s+/g, ' ')} - ${Date.now() - start}ms`);
      } else {
        logger.debug(`${text.replace(/\n/g," ").replace(/\s+/g, ' ')}`);
      }
    },
    onConnectionOpened: () => {
      logger.info(
          `Opened connection. Active connections = ${++connectionsCount}`,
      );
    },
    onConnectionClosed: () => {
      logger.info(
          `Closed connection. Active connections = ${--connectionsCount}`,
      );
    },
  });

  // close connections on exit
  process.once('SIGTERM', () => {
    db.dispose().catch((ex) => {
      console.error(ex);
    });
  });

  await migrate(logger);
}

async function migrate(logger) {
  try {
    await db.query(sql`CREATE TABLE IF NOT EXISTS _db_migrations (
		id INT AUTO_INCREMENT PRIMARY KEY,
		hash VARCHAR(255),
		filename VARCHAR(255),
		executionTime DATETIME
	  );
`);

    // List the directory containing the .sql files
    const files = await fs.promises.readdir("./migrations");

    // Filter the array to only include .sql files
    const sqlFiles = files.filter((file) => file.endsWith(".sql"));

    // Read each .sql file and execute the SQL statements
    for (const file of sqlFiles) {
      logger.info(`Processing DB migration ${file}`);
      const sqlStatement = await fs.promises.readFile(
        `./migrations/${file}`,
        "utf8"
      );

      // Hash the SQL statements
      const hash = crypto
        .createHash("sha256")
        .update(sqlStatement)
        .digest("hex");

      // Check if the SQL has already been executed by checking the hashes in the dedicated table
      const rows = await db.query(
        sql`SELECT * FROM _db_migrations WHERE hash = ${hash}`
      );

      // If the hash is not in the table, execute the SQL and store the hash in the table
      if (rows.length === 0) {
        await db.tx(async (dbi) => {
          await dbi.query(sql.file(`./migrations/${file}`));
        })

        logger.info(`Successfully executed SQL from ${file}.`);

        // Store the hash in the dedicated table
        await db.query(
          sql`INSERT INTO _db_migrations (hash, filename, executionTime) VALUES (${hash}, ${file}, NOW())`
        );
        logger.info(`Successfully stored hash in executed_sql_hashes table.`);
      } else {
        logger.info(`SQL from ${file} has already been executed. Skipping.`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}
