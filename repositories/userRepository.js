const pool = require('../config/database');
const User = require('../models/User');
const UserResponse = require('../models/UserResponse');
const AccountStatusResponse = require('../models/AccountStatusResponse');

class UserRepository {
    
    /**
     * Verifica si un email está disponible para uso
     * @param {string} email - Email a verificar
     * @param {number} [excludeUserId] - ID del usuario a excluir de la verificación (para updates)
     * @returns {Promise<boolean>} true si el email está disponible, false si ya existe
     * @throws {Error} Si hay un error en la base de datos
     */
    async _checkEmailAvailability(email, excludeUserId = null) {
        try {
            const existingUser = await this.findByEmail(email);
            
            if (!existingUser) {
                return true; // Email disponible
            }
            
            // Si se está excluyendo un usuario específico, verificar que no sea el mismo
            if (excludeUserId && existingUser.id !== parseInt(excludeUserId)) {
                return false; // Email ya existe en otro usuario
            }
            
            // Si no se está excluyendo ningún usuario, el email no está disponible
            return false;
        } catch (error) {
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
        // Si ya es un error personalizado, re-lanzarlo
        if (error.statusCode) {
            return error;
        }
        
        // Crear error mejorado
        const enhancedError = new Error(`Error ${operation} usuario: ${error.message}`);
        enhancedError.statusCode = 500;
        enhancedError.originalError = error;
        enhancedError.operation = operation;
        return enhancedError;
    }


    /**
     * Ejecuta una query y retorna el usuario resultante
     * @param {string} query - Query SQL a ejecutar
     * @param {Array} values - Valores para la query
     * @returns {User|null} Usuario encontrado o null si no existe
     */
    async _executeQueryAndReturnUser(query, values) {
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return User.fromDatabase(result.rows[0]);
    }
    
    
    /**
     * CREATE - Crear un nuevo usuario
     * @param {Object} userData - Datos del usuario a crear
     * @param {string} userData.name - Nombre del usuario
     * @param {string} userData.email - Email del usuario (debe ser único)
     * @param {string} userData.password - Contraseña del usuario (ya encriptada)
     * @returns {Promise<UserResponse>} Usuario creado (sin información sensible)
     * @throws {Error} Si hay un error en la base de datos
     * @throws {Error} Si el email ya existe (código 409)
     */
    async create(userData) {
        console.log(`🔍 [UserRepository] Intento de crear usuario con email: ${userData.email}`);
        
        try {
            const { name, email, password, phone } = userData;
            
            // Verificar disponibilidad del email
            const isEmailAvailable = await this._checkEmailAvailability(email);
            if (!isEmailAvailable) {
                console.log(`🚫 [UserRepository] El email ya existe: ${email}`);
                throw this._createDuplicateEmailError('El email ya existe', email);
            }
            
            // Crear usuario
            const query = `
                INSERT INTO users (name, email, password, phone)
                VALUES ($1, $2, $3, $4)
                    RETURNING *
            `;

            const values = [name, email, password, phone];
            const createdUser = await this._executeQueryAndReturnUser(query, values);
            
            console.log(`✅ [UserRepository] Usuario creado con ID: ${createdUser.id}`);
            return UserResponse.fromUser(createdUser);
            
        } catch (error) {
            console.error(`❌ [UserRepository] Error creando usuario: ${error.message}`);
            throw this._handleDatabaseError(error, 'creando');
        }
    }

    
    
    // READ - Obtener usuario por ID
    async findById(id) {
        try {
            const query = `
                SELECT * FROM users 
                WHERE id = $1 AND account_status != 'DELETED'
            `;
            
            const result = await pool.query(query, [id]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return UserResponse.fromUser(User.fromDatabase(result.rows[0]));
        } catch (error) {
            throw new Error(`Error finding user by ID: ${error.message}`);
        }
    }


    // READ - Obtener usuario por ID
    async findByIdAndEmail(id, email) {
        try {
            const query = `
                SELECT * FROM users 
                WHERE id = $1 AND email= $2 AND account_status != 'DELETED'
            `;

            const result = await pool.query(query, [id, email]);

            if (result.rows.length === 0) {
                return null;
            }

            return UserResponse.fromUser(User.fromDatabase(result.rows[0]));
        } catch (error) {
            throw new Error(`Error finding user by ID: ${error.message}`);
        }
    }

    
    // READ - Obtener usuario por email
    async findByEmail(email) {
        try {
            const query = `
                SELECT * FROM users 
                WHERE email = $1 AND account_status != 'DELETED'
            `;
            
            const result = await pool.query(query, [email]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return User.fromDatabase(result.rows[0]);
        } catch (error) {
            throw new Error(`Error finding user by email: ${error.message}`);
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
        try {
            const { validatedPage, validatedSize, offset } = this._validateAndCalculatePagination(page, size);
            const { totalItems, users } = await this._fetchPaginatedData(validatedSize, offset);
            
            const PaginatedUserResponse = require('../models/PaginatedUserResponse');
            return PaginatedUserResponse.createPaginated(users, totalItems, validatedPage, validatedSize);
            
        } catch (error) {
            throw new Error(`Error finding paginated users: ${error.message}`);
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
        
        const [countResult, usersResult] = await Promise.all([
            pool.query(countQuery),
            pool.query(usersQuery, [size, offset])
        ]);
        
        const totalItems = parseInt(countResult.rows[0].total);
        const users = usersResult.rows.map(row => UserResponse.fromUser(User.fromDatabase(row)));
        
        return { totalItems, users };
    }
    

    /**
     * Construye la query de actualización dinámicamente
     * @param {Object} updateData - Datos a actualizar
     * @returns {Object} Objeto con campos de actualización, valores y contador de parámetros
     */
    _buildUpdateQuery(updateData) {
        const updateFields = [];
        const values = [];
        let paramCount = 0;

        // Agregar campos a actualizar dinámicamente
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

        // Si no hay campos para actualizar, lanzar error
        if (updateFields.length === 0) {
            throw new Error('No hay campos válidos para actualizar');
        }

        return { updateFields, values, paramCount };
    }



    /**
     * UPDATE - Actualizar usuario
     * @param {number} id - ID del usuario a actualizar
     * @param {Object} updateData - Datos a actualizar
     * @param {string} [updateData.name] - Nuevo nombre del usuario
     * @param {string} [updateData.email] - Nuevo email del usuario (debe ser único)
     * @returns {Promise<UserResponse>} Usuario actualizado (sin información sensible)
     * @throws {Error} Si hay un error en la base de datos
     * @throws {Error} Si el email ya existe en otro usuario (código 409)
     * @throws {Error} Si el usuario no existe (código 404)
     */
    async update(id, updateData) {
        console.log(`🔍 [UserRepository] Intento de actualizar usuario con ID: ${id}`);
        
        try {
            // Primero verificar si el usuario existe
            const existingUser = await this.findById(id);
            if (!existingUser) {
                return null;
            }
            
            const { name, email } = updateData;
            
            // Verificar disponibilidad del email (excluyendo usuario actual)
            if (email) {
                const isEmailAvailable = await this._checkEmailAvailability(email, id);
                if (!isEmailAvailable) {
                    console.log(`🚫 [UserRepository] El email ya existe en otro usuario: ${email}`);
                    throw this._createDuplicateEmailError('El email ya existe en otro usuario', email);
                }
            }
            
            // Construir query de actualización
            const { updateFields, values, paramCount } = this._buildUpdateQuery(updateData);
            
            // Agregar ID al final de los valores
            values.push(id);
            
            // Ejecutar actualización
            const query = `
                UPDATE users 
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramCount + 1} AND account_status != 'DELETED'
                RETURNING *
            `;
            
            const updatedUser = await this._executeQueryAndReturnUser(query, values);
            
            if (!updatedUser) {
                console.log(`❌ [UserRepository] Usuario no encontrado o ya eliminado: ${id}`);
                return null;
            }
            
            console.log(`✅ [UserRepository] Usuario actualizado con ID: ${updatedUser.id}`);
            return UserResponse.fromUser(updatedUser);
            
        } catch (error) {
            console.error(`❌ [UserRepository] Error actualizando usuario: ${error.message}`);
            throw this._handleDatabaseError(error, 'actualizando');
        }
    }



    /**
     * UPDATE - Actualizar contraseña del usuario
     * @param {number} id - ID del usuario a actualizar
     * @param {string} password - Contraseña a actualizar
     * @returns {Promise<Boolean>} Usuario actualizado (sin información sensible)
     * @throws {Error} Si hay un error en la base de datos
     * @throws {Error} Si el usuario no existe (código 404)
     */
    async updatePassword(id, password) {
        console.log(`🔍 [UserRepository] Intento de actualizar contraseña del usuario con ID: ${id}`);

        try {
            // Primero verificar si el usuario existe
            const existingUser = await this.findById(id);
            if (!existingUser) {
                return false;
            }

            // Construir query de actualización
            const { updateFields, values, paramCount } = this._buildUpdateQuery({ password });

            // Agregar campo updated_at fijo y el id al final
            const query = `
            UPDATE users
            SET ${updateFields}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount + 1} AND account_status != 'DELETED'
            RETURNING *
        `;

            values.push(id);

            const updatedUser = await this._executeQueryAndReturnUser(query, values);

            if (!updatedUser) {
                console.log(`❌ [UserRepository] Usuario no encontrado o ya eliminado: ${id}`);
                return false;
            }

            console.log(`✅ [UserRepository] Contraseña actualizada para el usuario con ID: ${updatedUser.id}`);
            return true

        } catch (error) {
            console.error(`❌ [UserRepository] Error actualizando usuario: ${error.message}`);
            throw this._handleDatabaseError(error, 'actualizando');
        }
    }

    // DELETE - Eliminación lógica (cambia account_status a DELETED)
    async delete(id) {
        try {
            const query = `
                UPDATE users 
                SET account_status = 'DELETED'
                WHERE id = $1 AND account_status != 'DELETED'
                RETURNING *
            `;
            
            const result = await pool.query(query, [id]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return User.fromDatabase(result.rows[0]);
        } catch (error) {
            throw new Error(`Error deleting user: ${error.message}`);
        }
    }

    // Verificar cuenta - Cambia account_status de PENDING_VALIDATION a VERIFIED
    async verifyAccount(id) {
        try {
            const query = `
                UPDATE users 
                SET account_status = 'VERIFIED'
                WHERE id = $1 AND account_status = 'PENDING_VALIDATION'
                RETURNING *
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                throw new Error(`❌ No se pudo verificar el usuario con ID ${id}. Es posible que no exista o que no esté en estado PENDING_VALIDATION.`);
            }

            const user = result.rows[0];

            return { account_status: user.account_status };
        } catch (error) {
            throw new Error(`Error verifying user: ${error.message}`);
        }
    }
}

module.exports = UserRepository;

