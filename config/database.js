const { Pool } = require("pg");

const poolConfig = {
    host: process.env.DB_HOST || "database",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || "admin_user",
    password: process.env.DB_PASSWORD || "supersecurepassword",
    database: process.env.DB_NAME || "usuariosdb"
};

const pool = new Pool(poolConfig);

async function connectWithRetry(retries = 5, delay = 5000) {
    for (let i = 1; i <= retries; i++) {
        try {
            const client = await pool.connect();
            console.log("✅ Connected to PostgreSQL");
            client.release();
            return; // éxito → salimos
        } catch (err) {
            console.error(`❌ Attempt ${i} failed:`, err.message);

            if (i < retries) {
                console.log(`🔄 Retrying in ${delay / 1000} seconds...`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                console.error("❌ All retries failed. Exiting...");
                process.exit(1);
            }
        }
    }
}

// Llamar al inicio de la app
connectWithRetry();

module.exports = pool;
