const UserRegister = require('../models/UserRegister');
const UserUpdate = require('../models/UserUpdate');
const UserResponse = require('../models/UserResponse');
const UserAuthResponse = require('../models/UserAuthResponse');
const UserRepository = require('../repositories/userRepository');
const ResponseModel = require('../models/ResponseModel');
const OtpRepository = require("../repositories/otpRepository");
const OtpServiceClient = require("../client/otpServiceClient");
const AccountStatusResponse = require("../models/AccountStatusResponse");
const logger = require("../logger/Logger");

class UserControllerDB {

    constructor() {
        this.userRepository = new UserRepository();
        this.otpRepository = new OtpRepository();
        this.otpServiceClient = new OtpServiceClient();
        
    }

    /**
     * Maneja errores específicos del controlador
     * @param {Error} error - Error capturado
     * @returns {ResponseModel} Respuesta formateada según el tipo de error
     */
    _handleControllerError(error) {
        const controller = "UserControllerDB";
        logger.error(controller, "❌ Error capturado en controlador", {
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            stack: error.stack
        });

        // Manejar error de email duplicado
        if (error.statusCode === 409 || error.code === "EMAIL_DUPLICATE") {
            return ResponseModel.emailDuplicate("El email ya existe");
        }

        // Manejar errores de base de datos
        if (error.statusCode === 500) {
            return ResponseModel.databaseError("Error interno del servidor");
        }

        // Error genérico
        return ResponseModel.internalError("Ocurrió un error inesperado");
    }

    /**
     * Crea respuesta exitosa estandarizada
     * @param {string} message - Mensaje de éxito
     * @param {Object} data - Datos de la respuesta
     * @param {number} statusCode - Código de estado HTTP
     * @returns {ResponseModel} Respuesta formateada
     */
    _createSuccessResponse(message, data, statusCode = 200) {
        const controller = "UserControllerDB";
        logger.debug(controller, "📦 Creando respuesta exitosa", { message, statusCode });
        return ResponseModel.success(message, data, statusCode);
    }

    /**
     * POST /api/users/register
     * Registra un nuevo usuario en la base de datos
     * @param {Object} req - Request object de Express
     * @param {Object} res - Response object de Express
     */
    async registerUser(req, res) {
        const controller = "UserControllerDB";
        logger.info(controller, "🚀 Registrando nuevo usuario...");

        try {
            const userRegister = new UserRegister(req.body);
            logger.debug(controller, "📝 Validando unicidad de email", { email: userRegister.email });

            const createdUser = await this.userRepository.create(userRegister);

            logger.info(controller, "✅ Usuario registrado correctamente", { userId: createdUser.id });

            const userResponse = UserResponse.fromUser(createdUser);
            const response = this._createSuccessResponse(
                "Usuario registrado exitosamente",
                userResponse.toJSON(),
                201
            );

            return response.send(res);

        } catch (error) {
            const response = this._handleControllerError(error);
            logger.warn(controller, "⚠️ Error al registrar usuario", { email: req.body?.email });
            response.log(`[${controller}]`);
            return response.send(res);
        }
    }


    /**
    * PUT /api/users/{id}
    * Actualiza un usuario existente en la base de datos
    */
    async updateUser(req, res) {
        const controller = "UserControllerDB";
        const userId = parseInt(req.params.id);
        logger.info(controller, "🚀 Actualizando usuario...", { userId });

        try {
            const userUpdate = new UserUpdate(req.body);
            logger.debug(controller, "📝 Validando datos de actualización", {
                userId,
                email: userUpdate.email,
            });

            const updatedUser = await this.userRepository.update(userId, userUpdate);

            if (!updatedUser) {
                logger.warn(controller, "⚠️ Usuario no encontrado para actualización", { userId });
                const response = ResponseModel.notFound("Usuario no encontrado");
                response.log(`[${controller}]`);
                return response.send(res);
            }

            const userResponse = UserResponse.fromUser(updatedUser);
            logger.info(controller, "✅ Usuario actualizado exitosamente", { userId: updatedUser.id });

            const response = this._createSuccessResponse(
                "Usuario actualizado exitosamente",
                userResponse.toJSON()
            );

            return response.send(res);

        } catch (error) {
            logger.error(controller, "❌ Error al actualizar usuario", {
                userId,
                message: error.message,
                stack: error.stack,
            });
            const response = this._handleControllerError(error);
            response.log(`[${controller}]`);
            return response.send(res);
        }
    }

    /**
     * GET /api/users?page=x&size=y
     * Obtiene todos los usuarios paginados
     */
    async getAllUsersPaginated(req, res) {
        const controller = "UserControllerDB";
        logger.info(controller, "🚀 Obteniendo usuarios paginados...");

        try {
            const page = parseInt(req.query.page) || 1;
            const size = parseInt(req.query.size) || 10;
            logger.debug(controller, "📝 Parámetros de paginación recibidos", { page, size });

            if (page < 1) {
                logger.warn(controller, "⚠️ Página inválida solicitada", { page });
                const response = ResponseModel.badRequest("El número de página debe ser mayor a 0");
                response.log(`[${controller}]`);
                return response.send(res);
            }

            if (size < 1 || size > 100) {
                logger.warn(controller, "⚠️ Tamaño de página inválido", { size });
                const response = ResponseModel.badRequest("El tamaño de página debe estar entre 1 y 100");
                response.log(`[${controller}]`);
                return response.send(res);
            }

            const paginatedUsers = await this.userRepository.findAllPaginated(page, size);
            logger.info(controller, "✅ Usuarios obtenidos exitosamente", {
                totalItems: paginatedUsers.totalItems,
                totalPages: paginatedUsers.totalPages,
            });

            const response = this._createSuccessResponse(
                "Usuarios obtenidos exitosamente",
                paginatedUsers.toJSON()
            );

            return response.send(res);

        } catch (error) {
            logger.error(controller, "❌ Error al obtener usuarios paginados", {
                message: error.message,
                stack: error.stack,
            });
            const response = this._handleControllerError(error);
            response.log(`[${controller}]`);
            return response.send(res);
        }
    }

    /**
     * GET /api/users/{id}
     * Obtiene un usuario específico por ID
     */
    async getUserById(req, res) {
        const controller = "UserControllerDB";
        const userId = parseInt(req.params.id);
        logger.info(controller, "🚀 Obteniendo usuario por ID...", { userId });

        try {
            const user = await this.userRepository.findById(userId);

            if (!user) {
                logger.warn(controller, "⚠️ Usuario no encontrado", { userId });
                const response = ResponseModel.notFound("Usuario no encontrado");
                response.log(`[${controller}]`);
                return response.send(res);
            }

            logger.info(controller, "✅ Usuario obtenido exitosamente", { userId: user.id });

            const userResponse = UserResponse.fromUser(user);
            const response = this._createSuccessResponse(
                "Usuario obtenido exitosamente",
                userResponse.toJSON()
            );

            return response.send(res);

        } catch (error) {
            logger.error(controller, "❌ Error al obtener usuario por ID", {
                userId,
                message: error.message,
                stack: error.stack,
            });
            const response = this._handleControllerError(error);
            response.log(`[${controller}]`);
            return response.send(res);
        }
    }

    /**
 * GET /api/users/email/{email}
 * Obtiene un usuario específico por email
 */
    async getUserByEmail(req, res) {
        const userEmail = req.query.value;
        console.log(`🚀 [UserControllerDB] Iniciando búsqueda de usuario por email: ${userEmail}`);

        try {
            if (!userEmail) {
                console.warn("⚠️ [UserControllerDB] Email no proporcionado en la solicitud");
                const response = ResponseModel.badRequest('Debe proporcionar un email válido');
                return response.send(res);
            }

            console.log(`🔍 [UserControllerDB] Consultando usuario en repositorio...`);
            const user = await this.userRepository.findByEmail(userEmail);

            if (!user) {
                console.warn(`🚫 [UserControllerDB] Usuario no encontrado con email: ${userEmail}`);
                const response = ResponseModel.notFound('Usuario no encontrado');
                response.log('[UserControllerDB]');
                return response.send(res);
            }

            console.log(`✅ [UserControllerDB] Usuario encontrado: ${userEmail}`);
            const userResponse = UserAuthResponse.fromUser(user);

            const response = this._createSuccessResponse(
                'Usuario obtenido exitosamente',
                userResponse.toJSON()
            );

            return response.send(res);

        } catch (error) {
            console.error(`❌ [UserControllerDB] Error obteniendo usuario (${userEmail}):`, error.message);
            const response = this._handleControllerError(error);
            response.log('[UserControllerDB]');
            return response.send(res);
        }
    }

    /**
     * DELETE /api/users/{id}
     * Elimina lógicamente un usuario (soft delete)
     */
    async deleteUser(req, res) {
        const userId = parseInt(req.params.id);
        console.log(`🚀 [UserControllerDB] Solicitando eliminación de usuario con ID: ${userId}`);

        try {
            console.log(`🗑️ [UserControllerDB] Ejecutando eliminación lógica...`);
            const deletedUser = await this.userRepository.delete(userId);

            if (!deletedUser) {
                console.warn(`🚫 [UserControllerDB] Usuario no encontrado o ya eliminado (ID: ${userId})`);
                const response = ResponseModel.notFound('Usuario no encontrado o ya eliminado');
                response.log('[UserControllerDB]');
                return response.send(res);
            }

            console.log(`✅ [UserControllerDB] Eliminación lógica completada para ID: ${userId}`);
            const response = this._createSuccessResponse('El usuario se eliminó satisfactoriamente');
            return response.send(res);

        } catch (error) {
            console.error(`❌ [UserControllerDB] Error eliminando usuario (${userId}):`, error.message);
            const response = this._handleControllerError(error);
            response.log('[UserControllerDB]');
            return response.send(res);
        }
    }

    /**
     * PATCH /api/users/{id}/password
     * Verifica un OTP y reestablece contraseña
     */
    async updatePassword(req, res) {
        console.log('🚀 [UserControllerDB] Iniciando flujo de restablecimiento de contraseña...');
        const userId = parseInt(req.params.id);

        try {
            const { otp, email, password } = req.body;
            console.log(`📩 [UserControllerDB] Datos recibidos -> OTP: ${otp}, Email: ${email}, ID: ${userId}`);

            if (!otp || !email || !password) {
                console.warn("⚠️ [UserControllerDB] Datos faltantes en la solicitud");
                const response = ResponseModel.badRequest('El OTP, el email y la contraseña son obligatorios');
                return response.send(res);
            }

            console.log(`🔍 [UserControllerDB] Validando formato del OTP con servicio externo...`);
            const formatResponse = await this.otpServiceClient.checkOtpFormat({ otp });

            if (!formatResponse.isValidOtp) {
                console.warn(`🚫 [UserControllerDB] OTP con formato inválido: ${otp}`);
                const response = ResponseModel.badRequest('El formato del OTP es inválido');
                return response.send(res);
            }

            console.log(`✅ [UserControllerDB] OTP válido. Consultando usuario (ID: ${userId}, Email: ${email})`);
            const user = await this.userRepository.findByIdAndEmail(userId, email);

            if (!user) {
                console.warn(`🚫 [UserControllerDB] Usuario no encontrado con ID ${userId} y email ${email}`);
                const response = ResponseModel.notFound('Usuario no encontrado');
                response.log('[UserControllerDB]');
                return response.send(res);
            }

            console.log(`✅ [UserControllerDB] Usuario encontrado, verificando OTP en base de datos...`);
            const isVerified = await this.otpRepository.verify(userId, email, otp);

            if (!isVerified) {
                console.warn(`🚫 [UserControllerDB] OTP inválido o expirado para usuario: ${email}`);
                const response = ResponseModel.badRequest('El OTP es inválido o ha expirado');
                return response.send(res);
            }

            console.log(`✅ [UserControllerDB] OTP verificado correctamente. Actualizando contraseña...`);
            const isUpdated = await this.userRepository.updatePassword(userId, password);

            if (!isUpdated) {
                console.error(`🚫 [UserControllerDB] Error al actualizar la contraseña para usuario: ${email}`);
                const response = ResponseModel.badRequest('Error al actualizar la contraseña');
                return response.send(res);
            }

            console.log(`🎉 [UserControllerDB] Contraseña actualizada exitosamente para ${email}`);
            const response = this._createSuccessResponse('Contraseña reestablecida exitosamente');
            return response.send(res);

        } catch (error) {
            console.error(`❌ [UserControllerDB] Error en updatePassword:`, error.message);
            const response = this._handleControllerError(error);
            response.log('[UserControllerDB]');
            return response.send(res);
        }
    }


    /**
     * PATCH /api/users/{id}/account_status
     * Verifica un usuario con estado PENDING_VALIDATION
     * @param {Object} req - Request object de Express
     * @param {Object} res - Response object de Express
     */
    async verifyUserAccount(req, res) {
        console.log('🚀 [UserControllerDB] Iniciando verificación de cuenta de usuario...');
        const userId = parseInt(req.params.id);

        try {
            console.log(`🔍 [UserControllerDB] Buscando usuario con ID: ${userId}`);
            const user = await this.userRepository.findById(userId);

            if (!user) {
                console.warn(`🚫 [UserControllerDB] Usuario no encontrado con ID: ${userId}`);
                const response = ResponseModel.notFound('Usuario no encontrado');
                response.log('[UserControllerDB]');
                return response.send(res);
            }

            console.log(`✅ [UserControllerDB] Usuario encontrado: ${user.email} (ID: ${user.id})`);
            console.log(`🔍 [UserControllerDB] Verificando estado de cuenta (actual: ${user.account_status})...`);

            // Realiza la verificación del usuario (cambia el estado de PENDING_VALIDATION → VERIFIED)
            const result = await this.userRepository.verifyAccount(user.id);

            if (!result) {
                console.warn(`🚫 [UserControllerDB] Fallo en la verificación. El usuario ya fue verificado o eliminado (ID: ${user.id})`);
                const response = ResponseModel.badRequest('El usuario ya ha sido verificado o borrado.');
                return response.send(res);
            }

            console.log(`🎉 [UserControllerDB] Cuenta verificada exitosamente para usuario: ${user.email}`);
            const resultResponse = AccountStatusResponse.fromDatabase(result);

            const response = this._createSuccessResponse(
                'Usuario verificado exitosamente',
                resultResponse.toJSON(),
                200
            );

            return response.send(res);

        } catch (error) {
            console.error(`❌ [UserControllerDB] Error verificando cuenta del usuario (${userId}):`, error.message);
            const response = this._handleControllerError(error);
            response.log('[UserControllerDB]');
            return response.send(res);
        }
    }

}

module.exports = UserControllerDB;
