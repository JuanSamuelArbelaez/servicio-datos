const ResponseModel = require('../models/ResponseModel');

// Ejemplos de uso del ResponseModel

// 1. Respuesta exitosa simple
function ejemploRespuestaExitosa(res) {
    const response = ResponseModel.success('Operación completada exitosamente');
    return response.send(res);
}

// 2. Respuesta exitosa con datos
function ejemploRespuestaConDatos(res, data) {
    const response = ResponseModel.success('Datos obtenidos correctamente', data);
    return response.send(res);
}

// 3. Respuesta exitosa con código de estado personalizado
function ejemploRespuestaCreado(res, data) {
    const response = ResponseModel.success('Recurso creado', data, 201);
    return response.send(res);
}

// 4. Error de validación
function ejemploErrorValidacion(res, errors) {
    const response = ResponseModel.validationError(errors, 'Los datos proporcionados no son válidos');
    return response.send(res);
}

// 5. Error de conflicto (409)
function ejemploErrorConflicto(res) {
    const response = ResponseModel.conflict('El recurso ya existe');
    return response.send(res);
}

// 6. Error de no encontrado (404)
function ejemploErrorNoEncontrado(res) {
    const response = ResponseModel.notFound('El usuario no fue encontrado');
    return response.send(res);
}

// 7. Error de base de datos
function ejemploErrorBaseDatos(res, error) {
    const response = ResponseModel.databaseError('Error en la base de datos', error);
    return response.send(res);
}

// 8. Error interno del servidor
function ejemploErrorInterno(res, error) {
    const response = ResponseModel.internalError('Algo salió mal', error);
    return response.send(res);
}

// 9. Error de email duplicado
function ejemploEmailDuplicado(res) {
    const response = ResponseModel.emailDuplicate('Este email ya está registrado');
    return response.send(res);
}

// 10. Uso con logging
function ejemploConLogging(res, data) {
    const response = ResponseModel.success('Operación exitosa', data);
    
    // Log de la respuesta
    response.log('[EjemploController]');
    
    return response.send(res);
}

// 11. Uso en controladores con manejo de errores
async function ejemploControladorCompleto(req, res) {
    try {
        // Simular operación exitosa
        const data = { id: 1, name: 'Ejemplo' };
        
        const response = ResponseModel.success('Usuario obtenido correctamente', data);
        return response.send(res);
        
    } catch (error) {
        console.error('Error en controlador:', error);
        
        let response;
        
        if (error.code === 'NOT_FOUND') {
            response = ResponseModel.notFound('Usuario no encontrado');
        } else if (error.code === 'VALIDATION_ERROR') {
            response = ResponseModel.validationError(error.details);
        } else {
            response = ResponseModel.internalError('Error inesperado', error.message);
        }
        
        // Log y enviar respuesta
        response.log('[EjemploController]');
        return response.send(res);
    }
}

// 12. Respuesta personalizada
function ejemploRespuestaPersonalizada(res, success, message, data, error, statusCode) {
    const response = new ResponseModel(success, message, data, error, statusCode);
    return response.send(res);
}

// 13. Uso en middleware de error
function middlewareError(error, req, res, next) {
    console.error('Error capturado por middleware:', error);
    
    let response;
    
    if (error.name === 'ValidationError') {
        response = ResponseModel.validationError(error.errors);
    } else if (error.name === 'CastError') {
        response = ResponseModel.notFound('ID inválido');
    } else if (error.code === 11000) {
        response = ResponseModel.conflict('Dato duplicado');
    } else {
        response = ResponseModel.internalError('Error interno del servidor');
    }
    
    response.log('[ErrorMiddleware]');
    return response.send(res);
}

module.exports = {
    ejemploRespuestaExitosa,
    ejemploRespuestaConDatos,
    ejemploRespuestaCreado,
    ejemploErrorValidacion,
    ejemploErrorConflicto,
    ejemploErrorNoEncontrado,
    ejemploErrorBaseDatos,
    ejemploErrorInterno,
    ejemploEmailDuplicado,
    ejemploConLogging,
    ejemploControladorCompleto,
    ejemploRespuestaPersonalizada,
    middlewareError
};
