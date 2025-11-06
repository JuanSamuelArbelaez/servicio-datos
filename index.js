const express = require("express");
const logger = require("./logger/Logger");
const packageJson = require("./package.json");

const app = express();
app.use(express.json());

// --- Tiempo de inicio y versión para health checks ---
const START_TIME = Date.now();
const VERSION = packageJson.version || "1.0.0";

// Función para formatear uptime
const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m ${secs}s`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
};

// Importar rutas
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

// --- Health Check Endpoints ---
app.get("/health", (req, res) => {
    const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);
    res.json({
        status: "UP",
        version: VERSION,
        uptime: formatUptime(uptimeSeconds),
        uptimeSeconds: uptimeSeconds
    });
});

app.get("/health/ready", (req, res) => {
    const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);
    res.json({
        status: "READY",
        version: VERSION,
        uptime: formatUptime(uptimeSeconds),
        uptimeSeconds: uptimeSeconds
    });
});

app.get("/health/live", (req, res) => {
    const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);
    res.json({
        status: "LIVE",
        version: VERSION,
        uptime: formatUptime(uptimeSeconds),
        uptimeSeconds: uptimeSeconds
    });
});

// Endpoint healthcheck del sistema (mantener compatibilidad)
app.get("/actuator/health", (req, res) => {
    logger.info("[App]", "Health check solicitado");
    const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);
    res.json({
        status: "UP",
        version: VERSION,
        uptime: formatUptime(uptimeSeconds),
        uptimeSeconds: uptimeSeconds
    });
});

// Usar rutas de usuarios y autenticación
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 8082;

app.listen(PORT, () => {
    logger.info("[App]", "Data-service iniciado correctamente", { port: PORT });
});

