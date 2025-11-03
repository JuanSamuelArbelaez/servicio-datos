const { Pool } = require("pg");
const logger = require("../logger/Logger"); // importa tu logger

const poolConfig = {
  host: process.env.DB_HOST || "database",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "admin_user",
  password: process.env.DB_PASSWORD || "supersecurepassword",
  database: process.env.DB_NAME || "usuariosdb",
};

const pool = new Pool(poolConfig);

async function connectWithRetry(retries = 5, delay = 5000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const client = await pool.connect();
      logger.info("Database", "✅ Conectado con PostgreSQL", { host: poolConfig.host, db: poolConfig.database });
      client.release();
      return; // éxito → salimos
    } catch (err) {
      logger.error("Database", `❌ Intento ${i} fallido`, { error: err.message });

      if (i < retries) {
        logger.warn("Database", `🔄 Reintentando conexión en ${delay / 1000} segundos...`, { attempt: i });
        await new Promise(res => setTimeout(res, delay));
      } else {
        logger.error("Database", "❌ Todos los intentos fallidos. Cerrando aplicación...");
        process.exit(1);
      }
    }
  }
}

// Llamar al inicio de la app
connectWithRetry();

module.exports = pool;
