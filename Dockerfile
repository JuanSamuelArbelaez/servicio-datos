# Imagen base Node
FROM node:18

# Crear directorio de la app
WORKDIR /app

# Copiar package.json e instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Variables de entorno (pueden ser sobreescritas en docker-compose)
ENV OTP_SERVICE_URL=http://servicio-otp:8084/api/otp

# Puerto expuesto
EXPOSE 8082

# Comando por defecto
CMD ["npm", "start"]
