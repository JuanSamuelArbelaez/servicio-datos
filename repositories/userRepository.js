const pool = require('../config/database');
const User = require('../models/User');
const UserResponse = require('../models/UserResponse');
const AccountStatusResponse = require('../models/AccountStatusResponse');
const logger = require("../logger/Logger");

class UserRepository {

    /**
    * Verifica si un email está disponible para uso
    * @param {string} email - Email a verificar
    * @param {number} [excludeUserId] - ID del usuario a excluir de la verificación (para updates)
    * @returns {Promise<boolean>} true si el email está disponible, false si ya existe
    * @throws {Error} Si hay un error en la base de datos
    */
    async _checkEmailAvailability(email, excludeUserId = null) {
        logger.debug("[UserRepository]", "Iniciando verificación de disponibilidad de email", { email, excludeUserId });

        try {
            const existingUser = await this.findByEmail(email);

            if (!existingUser) {
                logger.info("[UserRepository]", "Email disponible para registro", { email });
                return true;
            }

            // Si se está excluyendo un usuario específico
            if (excludeUserId && existingUser.id !== parseInt(excludeUserId)) {
                logger.warn("[UserRepository]", "Email en uso por otro usuario", {
                    email,
                    currentUserId: excludeUserId,
                    existingUserId: existingUser.id
                });
                return false;
            }

            // Email pertenece al mismo usuario (update) o ya está ocupado
            logger.warn("[UserRepository]", "Email no disponible", { email, excludeUserId });
            return false;

        } catch (error) {
            logger.error("[UserRepository]", "Error verificando disponibilidad del email", {
                email,
                error: error.message
            });
            throw new Error(`Error verificando disponibilidad del email: ${error.message}`);
        }
    }

    /**
     * Crea un error personalizado para email duplicado
     * @param {string} message - Mensaje del error
     * @param {string} email - Email que causó el conflicto
     * @returns {Error} Error personalizado con código 409
     */
    _createDuplicateEmailError(message, email) {
        logger.warn("[UserRepository]", "Email duplicado detectado", { email, message });
        const error = new Error(message);
        error.statusCode = 409;
        error.code = 'EMAIL_DUPLICATE';
        error.email = email;
        return error;
    }

    /**
     * Maneja y mejora errores de base de datos
     * @param {Error} error - Error original
     * @param {string} operation - Operación que falló (crear, actualizar, etc.)
     * @returns {Error} Error mejorado con información adicional
     */
    _handleDatabaseError(error, operation) {
        if (error.statusCode) {
            logger.debug("[UserRepository]", "Re-lanzando error personalizado", {
                operation,
                statusCode: error.statusCode,
                message: error.message
            });
            return error;
        }

        const enhancedError = new Error(`Error ${operation} usuario: ${error.message}`);
        enhancedError.statusCode = 500;
        enhancedError.originalError = error;
        enhancedError.operation = operation;

        logger.error("[UserRepository]", "Error interno en base de datos", {
            operation,
            message: error.message,
            stack: error.stack
        });

        return enhancedError;
    }


    /**
    * Ejecuta una query y retorna el usuario resultante
    * @param {string} query - Query SQL a ejecutar
    * @param {Array} values - Valores para la query
    * @returns {User|null} Usuario encontrado o null si no existe
    */
    async _executeQueryAndReturnUser(query, values) {
        logger.debug("[UserRepository]", "Ejecutando query SQL", { query, valuesCount: values.length });

        try {
            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                logger.info("[UserRepository]", "No se encontró usuario para los parámetros dados", { query });
                return null;
            }

            const user = User.fromDatabase(result.rows[0]);
            logger.debug("[UserRepository]", "Usuario obtenido desde base de datos", { id: user.id, email: user.email });
            return user;
        } catch (error) {
            logger.error("[UserRepository]", "Error ejecutando query SQL", {
                message: error.message,
                stack: error.stack,
                query
            });
            throw this._handleDatabaseError(error, "ejecutando query");
        }
    }

    /**
     * CREATE - Crear un nuevo usuario
     * @param {Object} userData - Datos del usuario a crear
     * @param {string} userData.name - Nombre del usuario
     * @param {string} userData.email - Email del usuario (debe ser único)
     * @param {string} userData.password - Contraseña del usuario (ya encriptada)
     * @param {string} userData.phone - Teléfono del usuario
     * @returns {Promise<UserResponse>} Usuario creado (sin información sensible)
     * @throws {Error} Si hay un error en la base de datos o el email ya existe
     */
    async create(userData) {
        logger.info("[UserRepository]", "Intentando crear nuevo usuario", { email: userData.email });

        try {
            const { name, email, password, phone } = userData;

            // 🔍 Verificar disponibilidad del email
            const isEmailAvailable = await this._checkEmailAvailability(email);
            if (!isEmailAvailable) {
                logger.warn("[UserRepository]", "Intento de creación con email duplicado", { email });
                throw this._createDuplicateEmailError("El email ya existe", email);
            }

            // 🚀 Insertar nuevo usuario
            const query = `
                INSERT INTO users (name, email, password, phone)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const values = [name, email, password, phone];
            const createdUser = await this._executeQueryAndReturnUser(query, values);

            if (!createdUser) {
                logger.error("[UserRepository]", "Error inesperado: no se devolvió usuario tras INSERT", { email });
                throw new Error("Error al crear el usuario, sin datos devueltos");
            }

            logger.info("[UserRepository]", "Usuario creado exitosamente", { id: createdUser.id, email });
            return UserResponse.fromUser(createdUser);

        } catch (error) {
            logger.error("[UserRepository]", "Error creando usuario", { email: userData.email, error: error.message });
            throw this._handleDatabaseError(error, "creando");
        }
    }

    /**
     * READ - Obtener usuario por ID
     * @param {number} id - ID del usuario a buscar
     * @returns {Promise<UserResponse|null>} Usuario encontrado o null si no existe
     */
    async findById(id) {
        logger.debug("[UserRepository]", "Buscando usuario por ID", { id });

        try {
            const query = `
                SELECT * FROM users 
                WHERE id = $1 AND account_status != 'DELETED'
            `;
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                logger.info("[UserRepository]", "Usuario no encontrado o eliminado", { id });
                return null;
            }

            const user = User.fromDatabase(result.rows[0]);
            logger.info("[UserRepository]", "Usuario obtenido exitosamente por ID", { id: user.id, email: user.email });
            return UserResponse.fromUser(user);

        } catch (error) {
            logger.error("[UserRepository]", "Error buscando usuario por ID", { id, error: error.message });
            throw this._handleDatabaseError(error, "buscando por ID");
        }
    }


    // READ - Obtener usuario por ID y email
    async findByIdAndEmail(id, email) {
        logger.debug("[UserRepository]", "Buscando usuario por ID y Email", { id, email });

        try {
            const query = `
                SELECT * FROM users 
                WHERE id = $1 AND email = $2 AND account_status != 'DELETED'
            `;

            const result = await pool.query(query, [id, email]);

            if (result.rows.length === 0) {
                logger.info("[UserRepository]", "Usuario no encontrado o eliminado", { id, email });
                return null;
            }

            const user = User.fromDatabase(result.rows[0]);
            logger.info("[UserRepository]", "Usuario encontrado por ID y Email", { id: user.id, email: user.email });
            return UserResponse.fromUser(user);

        } catch (error) {
            logger.error("[UserRepository]", "Error buscando usuario por ID y Email", {
                id, email, error: error.message, stack: error.stack
            });
            throw this._handleDatabaseError(error, "buscando usuario por ID y Email");
        }
    }

    // READ - Obtener usuario por email
    async findByEmail(email) {
        logger.debug("[UserRepository]", "Buscando usuario por Email", { email });

        try {
            const query = `
                SELECT * FROM users 
                WHERE email = $1 AND account_status != 'DELETED'
            `;
            const result = await pool.query(query, [email]);

            if (result.rows.length === 0) {
                logger.info("[UserRepository]", "Usuario no encontrado o eliminado", { email });
                return null;
            }

            const user = User.fromDatabase(result.rows[0]);
            logger.info("[UserRepository]", "Usuario encontrado por Email", { id: user.id, email: user.email });
            return user;

        } catch (error) {
            logger.error("[UserRepository]", "Error buscando usuario por Email", {
                email, error: error.message, stack: error.stack
            });
            throw this._handleDatabaseError(error, "buscando usuario por Email");
        }
    }

    /**
     * READ - Obtener usuarios paginados
     * @param {number} page - Número de página (base 1)
     * @param {number} size - Tamaño de cada página
     * @returns {Promise<PaginatedUserResponse>} Respuesta paginada con usuarios
     * @throws {Error} Si hay un error en la base de datos
     */
    async findAllPaginated(page = 1, size = 10) {
        logger.debug("[UserRepository]", "Consultando usuarios paginados", { page, size });

        try {
            const { validatedPage, validatedSize, offset } = this._validateAndCalculatePagination(page, size);
            const { totalItems, users } = await this._fetchPaginatedData(validatedSize, offset);

            const PaginatedUserResponse = require("../models/PaginatedUserResponse");
            const paginatedResponse = PaginatedUserResponse.createPaginated(
                users,
                totalItems,
                validatedPage,
                validatedSize
            );

            logger.info("[UserRepository]", "Usuarios paginados obtenidos exitosamente", {
                totalItems,
                page: validatedPage,
                size: validatedSize,
                totalPages: paginatedResponse.totalPages
            });

            return paginatedResponse;

        } catch (error) {
            logger.error("[UserRepository]", "Error obteniendo usuarios paginados", {
                page, size, error: error.message, stack: error.stack
            });
            throw this._handleDatabaseError(error, "obteniendo usuarios paginados");
        }
    }


    /**
     * Valida parámetros de paginación y calcula offset
     * @param {number} page - Página solicitada
     * @param {number} size - Tamaño de página
     * @returns {Object} Parámetros validados y offset calculado
     */
    _validateAndCalculatePagination(page, size) {
        const validatedPage = Math.max(1, page);
        const validatedSize = Math.min(Math.max(1, size), 100); // Entre 1 y 100
        const offset = (validatedPage - 1) * validatedSize;

        return { validatedPage, validatedSize, offset };
    }


    /**
    * Obtiene datos paginados de la base de datos
    * @param {number} size - Tamaño de página validado
    * @param {number} offset - Offset calculado
    * @returns {Promise<Object>} Total de items y usuarios de la página
    */
    async _fetchPaginatedData(size, offset) {
        logger.debug("[UserRepository]", "Iniciando consulta paginada de usuarios", { size, offset });

        try {
            const countQuery = `
                SELECT COUNT(*) as total
                FROM users 
                WHERE account_status != 'DELETED'
            `;

            const usersQuery = `
                SELECT * FROM users 
                WHERE account_status != 'DELETED'
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
            `;

            // Ejecutar ambas consultas en paralelo
            const [countResult, usersResult] = await Promise.all([
                pool.query(countQuery),
                pool.query(usersQuery, [size, offset])
            ]);

            const totalItems = parseInt(countResult.rows[0].total);
            const users = usersResult.rows.map(row =>
                UserResponse.fromUser(User.fromDatabase(row))
            );

            logger.info("[UserRepository]", "Consulta paginada completada", {
                totalItems,
                returnedUsers: users.length,
                pageSize: size,
                offset
            });

            return { totalItems, users };

        } catch (error) {
            logger.error("[UserRepository]", "Error obteniendo datos paginados", {
                size, offset, error: error.message, stack: error.stack
            });
            throw this._handleDatabaseError(error, "obteniendo datos paginados");
        }
    }

    /**
     * Construye la query de actualización dinámicamente
     * @param {Object} updateData - Datos a actualizar
     * @returns {Object} Objeto con campos de actualización, valores y contador de parámetros
     */
    _buildUpdateQuery(updateData) {
        logger.debug("[UserRepository]", "Construyendo query de actualización dinámica", { updateData });

        const updateFields = [];
        const values = [];
        let paramCount = 0;

        // Agregar campos dinámicamente
        if (updateData.name !== undefined) {
            paramCount++;
            updateFields.push(`name = $${paramCount}`);
            values.push(updateData.name);
        }

        if (updateData.email !== undefined) {
            paramCount++;
            updateFields.push(`email = $${paramCount}`);
            values.push(updateData.email);
        }

        if (updateData.password !== undefined) {
            paramCount++;
            updateFields.push(`password = $${paramCount}`);
            values.push(updateData.password);
        }

        if (updateData.phone !== undefined) {
            paramCount++;
            updateFields.push(`phone = $${paramCount}`);
            values.push(updateData.phone);
        }

        // Validación final
        if (updateFields.length === 0) {
            logger.warn("[UserRepository]", "Intento de actualización sin campos válidos", { updateData });
            throw new Error("No hay campos válidos para actualizar");
        }

        logger.debug("[UserRepository]", "Query dinámica de actualización generada correctamente", {
            updateFields,
            paramCount,
            fieldsCount: updateFields.length
        });

        return { updateFields, values, paramCount };
    }


    /**
   * UPDATE - Actualizar usuario
   */
    async update(id, updateData) {
        logger.info("[UserRepository]", "Intento de actualizar usuario", { id, updateData });

        try {
            // 1️⃣ Verificar si el usuario existe
            const existingUser = await this.findById(id);
            if (!existingUser) {
                logger.warn("[UserRepository]", "Usuario no encontrado para actualización", { id });
                return null;
            }

            // 2️⃣ Validar email si se intenta actualizar
            const { email } = updateData;
            if (email) {
                const isEmailAvailable = await this._checkEmailAvailability(email, id);
                if (!isEmailAvailable) {
                    logger.warn("[UserRepository]", "Intento de usar email duplicado en actualización", { id, email });
                    throw this._createDuplicateEmailError("El email ya existe en otro usuario", email);
                }
            }

            // 3️⃣ Construir query dinámica
            const { updateFields, values, paramCount } = this._buildUpdateQuery(updateData);
            values.push(id);

            const query = `
                UPDATE users 
                SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramCount + 1} AND account_status != 'DELETED'
                RETURNING *
            `;

            const updatedUser = await this._executeQueryAndReturnUser(query, values);

            if (!updatedUser) {
                logger.warn("[UserRepository]", "Usuario no encontrado o eliminado durante la actualización", { id });
                return null;
            }

            logger.info("[UserRepository]", "Usuario actualizado correctamente", { id: updatedUser.id });
            return UserResponse.fromUser(updatedUser);

        } catch (error) {
            logger.error("[UserRepository]", "Error actualizando usuario", { id, error: error.message, stack: error.stack });
            throw this._handleDatabaseError(error, "actualizando");
        }
    }


    /**
     * UPDATE - Actualizar contraseña del usuario
     */
    async updatePassword(id, password) {
        logger.info("[UserRepository]", "Intento de actualizar contraseña del usuario", { id });

        try {
            const existingUser = await this.findById(id);
            if (!existingUser) {
                logger.warn("[UserRepository]", "Usuario no encontrado para actualización de contraseña", { id });
                return false;
            }

            const { updateFields, values, paramCount } = this._buildUpdateQuery({ password });
            values.push(id);

            const query = `
                UPDATE users
                SET ${updateFields}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramCount + 1} AND account_status != 'DELETED'
                RETURNING *
            `;

            const updatedUser = await this._executeQueryAndReturnUser(query, values);

            if (!updatedUser) {
                logger.warn("[UserRepository]", "Usuario no encontrado o eliminado al intentar cambiar contraseña", { id });
                return false;
            }

            logger.info("[UserRepository]", "Contraseña actualizada correctamente", { id: updatedUser.id });
            return true;

        } catch (error) {
            logger.error("[UserRepository]", "Error actualizando contraseña", { id, error: error.message, stack: error.stack });
            throw this._handleDatabaseError(error, "actualizando contraseña");
        }
    }


    /**
     * DELETE - Eliminación lógica (cambia account_status a DELETED)
     */
    async delete(id) {
        logger.info("[UserRepository]", "Intento de eliminar usuario", { id });

        try {
            const query = `
                UPDATE users 
                SET account_status = 'DELETED', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND account_status != 'DELETED'
                RETURNING *
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                logger.warn("[UserRepository]", "Intento de eliminar usuario inexistente o ya eliminado", { id });
                return null;
            }

            const deletedUser = User.fromDatabase(result.rows[0]);
            logger.info("[UserRepository]", "Usuario eliminado lógicamente con éxito", { id: deletedUser.id });

            return deletedUser;

        } catch (error) {
            logger.error("[UserRepository]", "Error eliminando usuario", { id, error: error.message, stack: error.stack });
            throw this._handleDatabaseError(error, "eliminando");
        }
    }

    // Verificar cuenta - Cambia account_status de PENDING_VALIDATION a VERIFIED
    async verifyAccount(id) {
        logger.info('UserRepository', `Intentando verificar cuenta con ID: ${id}`);

        try {
            const query = `
                UPDATE users 
                SET account_status = 'VERIFIED'
                WHERE id = $1 AND account_status = 'PENDING_VALIDATION'
                RETURNING *
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                logger.warn('UserRepository', `No se pudo verificar el usuario con ID ${id}. Posiblemente no existe o no está en estado PENDING_VALIDATION.`);
                throw new Error(`No se pudo verificar el usuario con ID ${id}`);
            }

            const user = result.rows[0];
            logger.info('UserRepository', `Usuario con ID ${id} verificado correctamente. Estado actual: ${user.account_status}`);

            return { account_status: user.account_status };

        } catch (error) {
            logger.error('UserRepository', `Error al verificar el usuario con ID ${id}: ${error.message}`, { stack: error.stack });
            throw new Error(`Error verifying user: ${error.message}`);
        }
    }
}

module.exports = UserRepository;

