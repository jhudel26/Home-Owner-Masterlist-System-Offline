import mysql, { Pool, ResultSetHeader, PoolConnection } from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: Pool | undefined;
}

const pool: Pool =
  globalThis._mysqlPool ||
  mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "residential_masterlist",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis._mysqlPool = pool;
}

export async function dbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function dbExecute(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  try {
    const [result] = await pool.execute(sql, params);
    return result as ResultSetHeader;
  } catch (error) {
    console.error("Database execute error:", error);
    throw error;
  }
}

export async function dbTransaction<T>(callback: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
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

export async function closePool(): Promise<void> {
  await pool.end();
}

