# Servicio de Datos - API de Usuarios

Este microservicio proporciona una API REST completa para gestionar usuarios con PostgreSQL, incluyendo operaciones CRUD, paginación y eliminación lógica.

## 🚀 Características

- ✅ **CRUD completo** de usuarios (Crear, Leer, Actualizar, Eliminar)
- ✅ **Paginación** de usuarios con parámetros configurables
- ✅ **Eliminación lógica** (soft delete) sin perder datos
- ✅ **Validación de email único** en creación y actualización
- ✅ **Encriptación de contraseñas** con bcrypt
- ✅ **Validación robusta** de datos de entrada
- ✅ **Manejo de errores** estandarizado y consistente
- ✅ **Logs detallados** para debugging y monitoreo
- ✅ **Respuestas estructuradas** con ResponseModel
- ✅ **Queries optimizadas** con ejecución en paralelo

## 📋 Prerrequisitos

- Node.js 18+
- PostgreSQL 12+
- Docker (opcional, para desarrollo)

## 🛠️ Instalación

```bash
cd servicio-datos
npm install
```

## 🔧 Configuración

Las variables de entorno se configuran en el archivo `config/database.js`:

```javascript
DB_HOST=database
DB_PORT=5432
DB_USER=admin_user
DB_PASSWORD=supersecurepassword
DB_NAME=usuariosdb
```

## 🚀 Ejecución

```bash
npm start
```

El servicio estará disponible en `http://localhost:8082`

## 📡 Endpoints Disponibles

### 1. **POST /api/users/register** - Registrar Usuario
```http
POST /api/users/register
Content-Type: application/json

{
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "password": "password123"
}
```

**Respuesta Exitosa (201):**
```json
{
    "success": true,
    "message": "Usuario registrado exitosamente",
    "data": {
        "id": 1,
        "name": "Juan Pérez",
        "email": "juan@example.com",
        "account_status": "ACTIVE",
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z"
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Respuesta de Error (409 - Email duplicado):**
```json
{
    "success": false,
    "message": "El email ya existe",
    "data": null,
    "error": {
        "type": "EMAIL_DUPLICATE"
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. **GET /api/users** - Obtener Usuarios Paginados
```http
GET /api/users?page=1&size=10
```

**Parámetros de Query:**
- `page` (opcional): Número de página (por defecto: 1)
- `size` (opcional): Tamaño de página (por defecto: 10, máximo: 100)

**Respuesta Exitosa (200):**
```json
{
    "success": true,
    "message": "Usuarios obtenidos exitosamente",
    "data": {
        "totalItems": 150,
        "totalPages": 3,
        "currentPage": 1,
        "pageSize": 50,
        "users": [
            {
                "id": 1,
                "name": "Juan Pérez",
                "email": "juan@example.com",
                "account_status": "ACTIVE",
                "created_at": "2024-01-15T10:30:00.000Z",
                "updated_at": "2024-01-15T10:30:00.000Z"
            }
            // ... más usuarios
        ]
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Respuesta de Error (400 - Parámetros inválidos):**
```json
{
    "success": false,
    "message": "El número de página debe ser mayor a 0",
    "data": null,
    "error": null,
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. **GET /api/users/{id}** - Obtener Usuario por ID
```http
GET /api/users/1
```

**Respuesta Exitosa (200):**
```json
{
    "success": true,
    "message": "Usuario obtenido exitosamente",
    "data": {
        "id": 1,
        "name": "Juan Pérez",
        "email": "juan@example.com",
        "account_status": "ACTIVE",
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z"
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Respuesta de Error (404 - Usuario no encontrado):**
```json
{
    "success": false,
    "message": "Usuario no encontrado",
    "data": null,
    "error": null,
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 4. **PUT /api/users/{id}** - Actualizar Usuario
```http
PUT /api/users/1
Content-Type: application/json

{
    "name": "Juan Carlos Pérez",
    "email": "juancarlos@example.com"
}
```

**Respuesta Exitosa (200):**
```json
{
    "success": true,
    "message": "Usuario actualizado exitosamente",
    "data": {
        "id": 1,
        "name": "Juan Carlos Pérez",
        "email": "juancarlos@example.com",
        "account_status": "ACTIVE",
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:35:00.000Z"
    },
    "timestamp": "2024-01-15T10:35:00.000Z"
}
```

**Respuesta de Error (409 - Email duplicado):**
```json
{
    "success": false,
    "message": "El email ya existe en otro usuario",
    "data": null,
    "error": {
        "type": "EMAIL_DUPLICATE"
    },
    "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### 5. **DELETE /api/users/{id}** - Eliminar Usuario (Soft Delete)
```http
DELETE /api/users/1
```

**Respuesta Exitosa (200):**
```json
{
    "success": true,
    "message": "El usuario se eliminó satisfactoriamente",
    "data": null,
    "timestamp": "2024-01-15T10:40:00.000Z"
}
```

**Respuesta de Error (404 - Usuario no encontrado):**
```json
{
    "success": false,
    "message": "Usuario no encontrado",
    "data": null,
    "error": null,
    "timestamp": "2024-01-15T10:40:00.000Z"
}
```

## 🏗️ Arquitectura

```
servicio-datos/
├── config/
│   └── database.js              # Configuración de conexión a PostgreSQL
├── models/
│   ├── User.js                  # Modelo de usuario para la base de datos
│   ├── UserRegister.js          # Modelo para datos de registro
│   ├── UserUpdate.js            # Modelo para datos de actualización
│   ├── UserResponse.js          # Modelo para respuestas de la API
│   ├── PaginatedUserResponse.js # Modelo para respuestas paginadas
│   └── ResponseModel.js         # Modelo estandarizado para respuestas HTTP
├── repositories/
│   └── userRepository.js        # Capa de acceso a datos con métodos CRUD
├── controllers/
│   └── userControllerDB.js      # Controlador de la API con validaciones
├── routes/
│   └── userRoutes.js            # Definición de todas las rutas
├── examples/
│   └── ResponseModelExamples.js # Ejemplos de uso del ResponseModel
├── index.js                     # Punto de entrada de la aplicación
└── test-register.js             # Script de pruebas
```

## 🔐 Seguridad

- **Encriptación de contraseñas** usando bcrypt con 10 salt rounds
- **Validación de entrada** en múltiples capas (modelo, controlador, repositorio)
- **Manejo seguro de errores** sin exponer información sensible
- **Queries parametrizadas** para prevenir SQL injection
- **Validación de email único** en creación y actualización
- **Soft delete** para preservar integridad de datos

## 📊 Base de Datos

La tabla `users` tiene la siguiente estructura:

```sql
CREATE TYPE account_status_enum AS ENUM ('CREATED', 'ACTIVE', 'INACTIVE', 'DELETED');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    account_status account_status_enum NOT NULL DEFAULT 'CREATED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 📋 ResponseModel - Respuestas Estandarizadas

El `ResponseModel` proporciona una forma consistente y reutilizable de manejar respuestas HTTP:

### Uso Básico:
```javascript
const ResponseModel = require('../models/ResponseModel');

// Respuesta exitosa
const response = ResponseModel.success('Operación exitosa', data);
return response.send(res);

// Error de validación
const response = ResponseModel.validationError(errors);
return response.send(res);

// Error de conflicto
const response = ResponseModel.conflict('El recurso ya existe');
return response.send(res);
```

### Métodos Disponibles:
- **`ResponseModel.success(message, data, statusCode)`** - Respuestas exitosas
- **`ResponseModel.error(message, error, statusCode)`** - Errores genéricos
- **`ResponseModel.validationError(errors, message)`** - Errores de validación (400)
- **`ResponseModel.badRequest(message, error)`** - Bad Request (400)
- **`ResponseModel.conflict(message, error)`** - Conflictos (409)
- **`ResponseModel.notFound(message, error)`** - No encontrado (404)
- **`ResponseModel.internalError(message, error)`** - Error interno (500)
- **`ResponseModel.databaseError(message, error)`** - Errores de BD (500)
- **`ResponseModel.emailDuplicate(message)`** - Email duplicado (409)

### Características:
- ✅ Respuestas consistentes en toda la API
- ✅ Códigos de estado HTTP automáticos
- ✅ Timestamp automático en cada respuesta
- ✅ Método `.send(res)` para enviar directamente
- ✅ Método `.log(prefix)` para logging automático
- ✅ Manejo centralizado de errores

## 🚨 Códigos de Error

- **200**: Operación exitosa
- **201**: Usuario creado exitosamente
- **400**: Error de validación o bad request
- **404**: Usuario no encontrado
- **409**: Email ya existe o conflicto
- **500**: Error interno del servidor

## 📝 Logs

El servicio genera logs detallados con emojis para facilitar el debugging:

- 🚀 Inicio de operaciones
- 🔍 Operaciones de búsqueda
- 📝 Operaciones de escritura
- ✅ Operaciones exitosas
- ❌ Errores
- 🚫 Validaciones fallidas
- 🔐 Operaciones de seguridad
- 💾 Operaciones de base de datos

## 🧪 Pruebas

Para ejecutar las pruebas de la API:

```bash
node test-register.js
```

## 🔄 Paginación

El sistema de paginación incluye:

- **Parámetros configurables:** `page` y `size`
- **Límites de seguridad:** Máximo 100 usuarios por página
- **Metadatos completos:** Total de items, páginas y página actual
- **Ordenamiento:** Usuarios ordenados por fecha de creación (más recientes primero)
- **Filtrado:** Solo usuarios activos (no eliminados)
- **Optimización:** Queries en paralelo para mejor rendimiento

## 🗑️ Soft Delete

La eliminación lógica incluye:

- **Preservación de datos:** Los usuarios no se eliminan físicamente
- **Cambio de estado:** `account_status` cambia a `'DELETED'`
- **Validaciones:** Verificación de existencia y estado previo
- **Respuesta clara:** Solo mensaje de confirmación sin datos sensibles
