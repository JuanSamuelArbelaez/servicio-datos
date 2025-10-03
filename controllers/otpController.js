const OtpServiceClient = require("../client/otpServiceClient");
const ResponseModel = require("../models/ResponseModel");
const OtpRepository = require("../repositories/otpRepository");

class OtpController {
    constructor() {
        this.otpRepository = new OtpRepository();
        this.otpServiceClient = new OtpServiceClient();
    }

    async createOtp(req, res) {
        console.log("🚀 [OtpController] Creando OTP...");

        try {
            const { email } = req.body;
            if (!email) {
                const response = ResponseModel.badRequest("El email del usuario es obligatorio");
                return response.send(res);
            }

            // ✅ Generamos OTP con el servicio externo
            const otpResponse = await this.otpServiceClient.createOtp();

            // Guardamos OTP en nuestra DB con el email
            const createdOtp = await this.otpRepository.create({ otp: otpResponse.otp, email });

            const baseUrl = `http://localhost:8080`; // servicio de datos corriendo en 8082
            createdOtp.url = `${baseUrl}/api/v1/users/${createdOtp.user_id}/password`;

            const response = ResponseModel.success(
                "OTP creado exitosamente",
                createdOtp.toJSON(),
                201
            );
            console.log(`✅ [OtpController] OTP creado para usuario: ${email}`);
            return response.send(res);

        } catch (error) {
            console.error("❌ [OtpController] Error creando OTP:", error.message);
            const response = ResponseModel.internalError("Error al crear OTP");
            return response.send(res);
        }
    }
}

module.exports = OtpController;
