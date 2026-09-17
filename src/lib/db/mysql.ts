import mysql, { Pool, ResultSetHeader, PoolConnection } from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: Pool | undefined;
}

function createPool(): Pool {
  const newPool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "residential_masterlist",
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000,
  });

  // Attach error handler to prevent unhandled pool-level socket drops from terminating the process
  (newPool as any).on?.("error", (err: any) => {
    console.error("Database pool background error:", err?.code || err?.message || err);
  });

  return newPool;
}

const pool: Pool = globalThis._mysqlPool || createPool();
globalThis._mysqlPool = pool;

const RETRYABLE_CODES = new Set([
  "PROTOCOL_CONNECTION_LOST",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "ER_SERVER_SHUTDOWN",
  "ER_SOCKET_UNEXPECTED_CLOSE",
  "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
]);

function isRetryableConnectionError(error: any): boolean {
  if (!error) return false;
  const code = error.code || error.errno;
  if (typeof code === "string" && RETRYABLE_CODES.has(code)) return true;
  const message = (error.message || "").toLowerCase();
  return (
    message.includes("connection lost") ||
    message.includes("closed") ||
    message.includes("econnreset") ||
    message.includes("socket has been ended")
  );
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function dbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  } catch (error: any) {
    if (isRetryableConnectionError(error)) {
      console.warn(
        `Database connection drop detected in dbQuery (${error.code || error.message}). Attempting automatic retry in 300ms...`
      );
      await delay(300);
      try {
        const [retryRows] = await pool.execute(sql, params);
        return retryRows as T[];
      } catch (retryError) {
        console.error("Database query retry failed:", retryError);
        throw retryError;
      }
    }
    console.error("Database query error:", error);
    throw error;
  }
}

export async function dbExecute(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  try {
    const [result] = await pool.execute(sql, params);
    return result as ResultSetHeader;
  } catch (error: any) {
    if (isRetryableConnectionError(error)) {
      console.warn(
        `Database connection drop detected in dbExecute (${error.code || error.message}). Attempting automatic retry in 300ms...`
      );
      await delay(300);
      try {
        const [retryResult] = await pool.execute(sql, params);
        return retryResult as ResultSetHeader;
      } catch (retryError) {
        console.error("Database execute retry failed:", retryError);
        throw retryError;
      }
    }
    console.error("Database execute error:", error);
    throw error;
  }
}

export async function dbTransaction<T>(callback: (conn: PoolConnection) => Promise<T>): Promise<T> {
  let connection: PoolConnection;
  try {
    connection = await pool.getConnection();
  } catch (error: any) {
    if (isRetryableConnectionError(error)) {
      console.warn(
        `Database connection drop while acquiring transaction connection (${error.code || error.message}). Retrying in 300ms...`
      );
      await delay(300);
      connection = await pool.getConnection();
    } else {
      throw error;
    }
  }

  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error("Database transaction rolled back due to error:", error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}

