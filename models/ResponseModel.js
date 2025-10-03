class ResponseModel {
    constructor(success, message, data = null, error = null, statusCode = 200) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.error = error;
        this.statusCode = statusCode;
        this.timestamp = new Date().toISOString();
    }

    // Método estático para respuestas exitosas
    static success(message, data = null, statusCode = 200) {
        return new ResponseModel(true, message, data, null, statusCode);
    }

    // Método estático para respuestas de error
    static error(message, error = null, statusCode = 500) {
        return new ResponseModel(false, message, null, error, statusCode);
    }

    // Método estático para respuestas de validación
    static validationError(errors, message = 'Validation failed') {
        return new ResponseModel(false, message, null, { type: 'VALIDATION_ERROR', details: errors }, 400);
    }

    // Método estático para respuestas de bad request (400)
    static badRequest(message, error = null) {
        return new ResponseModel(false, message, null, error, 400);
    }

    // Método estático para respuestas de conflicto (409)
    static conflict(message, error = null) {
        return new ResponseModel(false, message, null, error, 409);
    }

    // Método estático para respuestas de no encontrado (404)
    static notFound(message, error = null) {
        return new ResponseModel(false, message, null, error, 404);
    }

    // Método estático para respuestas de error interno (500)
    static internalError(message = 'Internal server error', error = null) {
        return new ResponseModel(false, message, null, error, 500);
    }

    // Método estático para respuestas de error de base de datos
    static databaseError(message = 'Database error', error = null) {
        return new ResponseModel(false, message, null, { type: 'DATABASE_ERROR', details: error }, 500);
    }

    // Método estático para respuestas de email duplicado
    static emailDuplicate(message = 'Email already exists') {
        return new ResponseModel(false, message, null, { type: 'EMAIL_DUPLICATE' }, 409);
    }

    // Método para enviar la respuesta HTTP
    send(res) {
        return res.status(this.statusCode).json({
            success: this.success,
            message: this.message,
            data: this.data,
            error: this.error,
            timestamp: this.timestamp
        });
    }

    // Método para convertir a objeto plano
    toJSON() {
        return {
            success: this.success,
            message: this.message,
            data: this.data,
            error: this.error,
            timestamp: this.timestamp
        };
    }

    // Método para logging
    log(prefix = '') {
        const logMessage = `${prefix} Response: ${this.success ? '✅' : '❌'} ${this.message}`;
        if (this.success) {
            console.log(logMessage);
        } else {
            console.error(logMessage, this.error);
        }
    }
}

module.exports = ResponseModel;
