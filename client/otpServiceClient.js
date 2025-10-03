const axios = require("axios");

class OtpServiceClient {
    constructor() {
        // URL del servicio OTP desde variable de entorno
        this.baseUrl = process.env.OTP_SERVICE_URL || "http://localhost:8084/api/otp";
        console.log("url del sevicio otp: " + this.baseUrl)
    }


    /**
     * Llama al servicio-otp para crear un nuevo OTP
     * @returns {Promise<OtpCreationResponse>}
     */
    async createOtp() {
        try {
            const response = await axios.post(`${this.baseUrl}`);
            return response.data; // {"otp": "123456"}
        } catch (error) {
            console.error("❌ [OtpServiceClient] Error creando OTP:", error.message);
            throw error;
        }
    }

    /**
     * Llama al servicio-otp para validar el formato de un OTP
     * @param {CheckOtpFormatRequest} request
     * @returns {Promise<CheckOtpFormatResponse>}
     */
    async checkOtpFormat(request) {
        try {
            const response = await axios.post(`${this.baseUrl}/check`, request);
            return response.data; // {"isValidOtp": true/false}
        } catch (error) {
            console.error("❌ [OtpServiceClient] Error validando OTP:", error.message);
            throw error;
        }
    }
}

module.exports = OtpServiceClient;
