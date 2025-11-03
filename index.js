const express = require("express");
const logger = require("./logger/Logger");

const app = express();
app.use(express.json());

// Importar rutas
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

// Endpoint healthcheck del sistema
app.get("/actuator/health", (req, res) => {
    logger.info("[App]", "Health check solicitado");
    res.json({ status: "UP" });
});

// Usar rutas de usuarios y autenticación
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 8082;

app.listen(PORT, () => {
    logger.info("[App]", "Data-service iniciado correctamente", { port: PORT });
});

