const axios = require("axios");
const logger = require("../logger/Logger");

class OtpServiceClient {
    constructor() {
        this.baseUrl = process.env.OTP_SERVICE_URL || "http://localhost:8084/api/otp";
        logger.info("[OtpServiceClient]", "Inicializando cliente OTP", { baseUrl: this.baseUrl });
    }

    /**
     * Llama al servicio-otp para crear un nuevo OTP
     * @returns {Promise<OtpCreationResponse>}
     */
    async createOtp() {
        logger.info("[OtpServiceClient]", "Solicitando creación de OTP...");
        try {
            const response = await axios.post(`${this.baseUrl}`);
            logger.info("[OtpServiceClient]", "OTP creado exitosamente", { otp: response.data?.otp });
            return response.data; // {"otp": "123456"}
        } catch (error) {
            logger.error("[OtpServiceClient]", "Error creando OTP", { error: error.message });
            throw error;
        }
    }

    /**
     * Llama al servicio-otp para validar el formato de un OTP
     * @param {CheckOtpFormatRequest} request
     * @returns {Promise<CheckOtpFormatResponse>}
     */
    async checkOtpFormat(request) {
        logger.info("[OtpServiceClient]", "Validando formato de OTP", { request });
        try {
            const response = await axios.post(`${this.baseUrl}/check`, request);
            logger.info("[OtpServiceClient]", "Formato OTP validado exitosamente", { isValid: response.data?.isValidOtp });
            return response.data; // {"isValidOtp": true/false}
        } catch (error) {
            logger.error("[OtpServiceClient]", "Error validando formato de OTP", { error: error.message });
            throw error;
        }
    }
}

module.exports = OtpServiceClient;
