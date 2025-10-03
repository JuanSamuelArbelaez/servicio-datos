const express = require("express");

const app = express();
app.use(express.json());

// Importar rutas
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

// Endpoint healthcheck del sistema
app.get("/actuator/health", (req, res) => {
    res.json({ status: "UP" });
});

// Usar rutas de usuarios
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes)

app.listen(8082, () => {
    console.log("✅ Data-service escuchando en puerto 8082");
});
