const pool = require('../config/database');
const Otp = require('../models/Otp');
const UserRepository = require('../repositories/userRepository');
const OtpResponse = require('../models/OtpResponse');

class OtpRepository {

    constructor() {
        this.userRepository = new UserRepository();
    }


    /**
     * @private
     * Maneja y mejora errores de base de datos
     * @param {Error} error - Error original
     * @param {string} operation - Operación que falló (crear, actualizar, etc.)
     * @returns {Error} Error mejorado con información adicional
     */
    _handleDatabaseError(error, operation) {
        if (error.statusCode) {
            return error;
        }

        const enhancedError = new Error(`Error ${operation} OTP: ${error.message}`);
        enhancedError.statusCode = 500;
        enhancedError.originalError = error;
        enhancedError.operation = operation;
        return enhancedError;
    }

    /**
     * @private
     * Ejecuta una query y retorna el OTP resultante
     * @param {string} query - Query SQL a ejecutar
     * @param {Array} values - Valores para la query
     * @returns {Otp|null} OTP encontrado o null si no existe
     */
    async _executeQueryAndReturnOtp(query, values) {
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return null;
        }

        return Otp.fromDatabase(result.rows[0]);
    }

    /**
     * @private
     * Verifica si ya existe un OTP activo para un usuario específico.
     * @param {number} userId - ID del usuario a verificar
     * @returns {Promise<boolean>} true si hay un OTP activo, false si no
     */
    async _checkExistingActiveOtp(userId) {
        try {
            const expireQuery = `
                UPDATE otp
                SET otp_status = 'EXPIRED'
                WHERE otp_status = 'CREATED'
                  AND created_at <= NOW() - INTERVAL '5 minutes'
            `;

            await pool.query(expireQuery);
            const query = `
                SELECT 1
                FROM otp
                WHERE user_id = $1 AND otp_status = 'CREATED'
                LIMIT 1
            `;
            const result = await pool.query(query, [userId]);
            return result.rows.length > 0;
        } catch (error) {
            throw this._handleDatabaseError(error, 'verificando existencia de OTP');
        }
    }


    /**
     * CREATE - Crea un nuevo OTP para un usuario.
     * @param {{otp: string, email: string}} otpData - Datos del OTP a crear
     * @param {string} otpData.otp - PIN de 6 dígitos
     * @param {string} otpData.email - Email del usuario
     * @returns {Promise<OtpResponse>} OTP creado (sin información sensible)
     * @throws {Error} Si hay un error en la base de datos o si el usuario ya tiene un OTP activo
     */
    async create(otpData) {
        console.log(`🔍 [OtpRepository] Intento de crear OTP para el usuario: ${otpData.email}`);
        try {
            const { otp, email } = otpData;

            // 🔹 Buscar usuario por email
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                const error = new Error(`Usuario con email ${email} no encontrado`);
                error.statusCode = 404;
                throw error;
            }
            const user_id = user.id;

            // Paso 1: Verificar si ya existe un OTP activo para el usuario
            const hasActiveOtp = await this._checkExistingActiveOtp(user_id);
            if (hasActiveOtp) {
                const error = new Error('Ya existe un OTP activo para este usuario. Inténtelo de nuevo más tarde.');
                error.statusCode = 409;
                throw error;
            }

            // Paso 2: Crear el nuevo registro en la base de datos
            const query = `
                INSERT INTO otp (otp, user_id)
                VALUES ($1, $2)
                    RETURNING *
            `;
            const values = [otp, user_id];
            const createdOtp = await this._executeQueryAndReturnOtp(query, values);

            console.log(`✅ [OtpRepository] OTP creado con ID: ${createdOtp.id}`);
            return OtpResponse.fromOtp(createdOtp);

        } catch (error) {
            console.error(`❌ [OtpRepository] Error creando OTP: ${error.message}`);
            throw this._handleDatabaseError(error, 'creando');
        }
    }


    /**
     * VERIFY - Valida un OTP para un usuario.
     * @param {number} userId - ID del usuario
     * @param {string} email - Email del usuario
     * @param {string} otp - OTP de 6 dígitos proporcionado por el usuario
     * @returns {Promise<boolean>} true si el OTP es válido y se actualiza a VERIFIED, false si no es válido
     * @throws {Error} Si hay un error en la base de datos
     */
    async verify(userId, email, otp) {
        try {
            // 🔹 Buscar usuario por email
            const user = await this.userRepository.findByIdAndEmail(userId, email);
            if (!user) {
                console.log(`🚫 [OtpRepository] Usuario con ID ${userId} y correo ${email} no encontrado`);
                return false;
            }

            console.log(`🔍 [OtpRepository] Intento de verificar OTP para el usuario ${userId} con otp: ${otp}`);

            // Paso 1: Encontrar el OTP activo para el usuario y el OTP
            const findQuery = `
            SELECT *
            FROM otp
            WHERE user_id = $1 AND otp = $2 AND otp_status = 'CREATED'
        `;
            const otpToVerify = await this._executeQueryAndReturnOtp(findQuery, [userId, otp]);

            if (!otpToVerify) {
                console.log(`🚫 [OtpRepository] OTP no encontrado o ya inactivo para el usuario: ${userId}`);
                return false;
            }

            // Paso 2: Verificar si el OTP ha expirado (ej. 5 minutos)
            const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
            const now = new Date();
            const createdTime = new Date(otpToVerify.created_at);
            if (now.getTime() - createdTime.getTime() > FIVE_MINUTES_IN_MS) {
                console.log(`🚫 [OtpRepository] El OTP para el usuario ${userId} ha expirado`);
                // Actualizar a expirado en la base de datos
                const updateExpiredQuery = `
                    UPDATE otp SET otp_status = 'EXPIRED' WHERE id = $1
                `;
                await pool.query(updateExpiredQuery, [otpToVerify.id]);
                return false;
            }

            // Paso 3: Si es válido y no está expirado, actualizar su estado a VERIFIED
            const updateQuery = `
                UPDATE otp
                SET otp_status = 'VERIFIED'
                WHERE id = $1
                    RETURNING *
            `;
            const updatedOtp = await this._executeQueryAndReturnOtp(updateQuery, [otpToVerify.id]);

            if (updatedOtp) {
                console.log(`✅ [OtpRepository] OTP verificado exitosamente para el usuario: ${userId}`);
                return true;
            }

            return false;
        } catch (error) {
            console.error(`❌ [OtpRepository] Error verificando OTP: ${error.message}`);
            throw this._handleDatabaseError(error, 'verificando');
        }
    }

}

module.exports = OtpRepository;