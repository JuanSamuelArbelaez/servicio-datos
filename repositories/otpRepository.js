const pool = require('../config/database');
const Otp = require('../models/Otp');
const UserRepository = require('../repositories/userRepository');
const OtpResponse = require('../models/OtpResponse');
const logger = require("../logger/Logger");

class OtpRepository {
    constructor() {
        this.userRepository = new UserRepository();
    }

    /**
     * @private
     * Maneja y mejora errores de base de datos
     */
    _handleDatabaseError(error, operation) {
        if (error.statusCode) return error;

        const enhancedError = new Error(`Error ${operation} OTP: ${error.message}`);
        enhancedError.statusCode = 500;
        enhancedError.originalError = error;
        enhancedError.operation = operation;
        return enhancedError;
    }

    /**
     * @private
     * Ejecuta una query y retorna el OTP resultante
     */
    async _executeQueryAndReturnOtp(query, values) {
        const result = await pool.query(query, values);
        return result.rows.length > 0 ? Otp.fromDatabase(result.rows[0]) : null;
    }

    /**
     * @private
     * Verifica si ya existe un OTP activo para un usuario específico.
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
     */
    async create(otpData) {
        logger.info("[OtpRepository]", "Intento de crear OTP", { email: otpData.email });
        try {
            const { otp, email } = otpData;

            // Buscar usuario por email
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                const error = new Error(`Usuario con email ${email} no encontrado`);
                error.statusCode = 404;
                logger.warn("[OtpRepository]", "Usuario no encontrado al crear OTP", { email });
                throw error;
            }

            const user_id = user.id;

            // Verificar si ya existe un OTP activo
            const hasActiveOtp = await this._checkExistingActiveOtp(user_id);
            if (hasActiveOtp) {
                const error = new Error('Ya existe un OTP activo para este usuario. Inténtelo de nuevo más tarde.');
                error.statusCode = 409;
                logger.warn("[OtpRepository]", "OTP activo detectado", { userId: user_id, email });
                throw error;
            }

            // Crear nuevo OTP
            const query = `
                INSERT INTO otp (otp, user_id)
                VALUES ($1, $2)
                RETURNING *
            `;
            const values = [otp, user_id];
            const createdOtp = await this._executeQueryAndReturnOtp(query, values);

            logger.info("[OtpRepository]", "OTP creado exitosamente", { otpId: createdOtp.id, userId: user_id });
            return OtpResponse.fromOtp(createdOtp);

        } catch (error) {
            logger.error("[OtpRepository]", "Error creando OTP", { error: error.message });
            throw this._handleDatabaseError(error, 'creando');
        }
    }

    /**
     * VERIFY - Valida un OTP para un usuario.
     */
    async verify(userId, email, otp) {
        try {
            const user = await this.userRepository.findByIdAndEmail(userId, email);
            if (!user) {
                logger.warn("[OtpRepository]", "Usuario no encontrado al verificar OTP", { userId, email });
                return false;
            }

            logger.info("[OtpRepository]", "Intento de verificar OTP", { userId, email, otp });

            // Buscar OTP activo
            const findQuery = `
                SELECT *
                FROM otp
                WHERE user_id = $1 AND otp = $2 AND otp_status = 'CREATED'
            `;
            const otpToVerify = await this._executeQueryAndReturnOtp(findQuery, [userId, otp]);

            if (!otpToVerify) {
                logger.warn("[OtpRepository]", "OTP no encontrado o ya inactivo", { userId });
                return false;
            }

            // Verificar expiración
            const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
            const now = new Date();
            const createdTime = new Date(otpToVerify.created_at);

            if (now.getTime() - createdTime.getTime() > FIVE_MINUTES_IN_MS) {
                logger.warn("[OtpRepository]", "OTP expirado", { userId, otpId: otpToVerify.id });

                const updateExpiredQuery = `
                    UPDATE otp SET otp_status = 'EXPIRED' WHERE id = $1
                `;
                await pool.query(updateExpiredQuery, [otpToVerify.id]);
                return false;
            }

            // Actualizar a VERIFIED
            const updateQuery = `
                UPDATE otp
                SET otp_status = 'VERIFIED'
                WHERE id = $1
                RETURNING *
            `;
            const updatedOtp = await this._executeQueryAndReturnOtp(updateQuery, [otpToVerify.id]);

            if (updatedOtp) {
                logger.info("[OtpRepository]", "OTP verificado exitosamente", { userId, otpId: updatedOtp.id });
                return true;
            }

            logger.warn("[OtpRepository]", "No se pudo actualizar OTP a VERIFIED", { userId, otp });
            return false;
        } catch (error) {
            logger.error("[OtpRepository]", "Error verificando OTP", { error: error.message, userId, email });
            throw this._handleDatabaseError(error, 'verificando');
        }
    }
}

module.exports = OtpRepository;
