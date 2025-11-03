const OtpServiceClient = require("../client/otpServiceClient");
const ResponseModel = require("../models/ResponseModel");
const OtpRepository = require("../repositories/otpRepository");
const logger = require("../logger/Logger");  // ← importa el logger

class OtpController {
  constructor() {
    this.otpRepository = new OtpRepository();
    this.otpServiceClient = new OtpServiceClient();
  }

  async createOtp(req, res) {
    const controller = "OtpController";
    logger.info(controller, "🚀 Creando OTP...");

    try {
      const { email } = req.body;
      if (!email) {
        logger.warn(controller, "Solicitud sin email proporcionado", { body: req.body });
        const response = ResponseModel.badRequest("El email del usuario es obligatorio");
        return response.send(res);
      }

      // ✅ Generamos OTP con el servicio externo
      logger.debug(controller, "Llamando a OtpServiceClient para generar OTP");
      const otpResponse = await this.otpServiceClient.createOtp();

      // Guardamos OTP en nuestra DB con el email
      logger.debug(controller, "Guardando OTP en base de datos", { email });
      const createdOtp = await this.otpRepository.create({ otp: otpResponse.otp, email });

      // Construimos URL para cambio de contraseña
      const baseUrl = `http://localhost:8080`; // podrías mover esto a una env var
      createdOtp.url = `${baseUrl}/api/v1/users/${createdOtp.user_id}/password`;

      const response = ResponseModel.success(
        "OTP creado exitosamente",
        createdOtp.toJSON(),
        201
      );

      logger.info(controller, "✅ OTP creado correctamente", { email, otp_id: createdOtp.id });
      return response.send(res);

    } catch (error) {
      logger.error(controller, "❌ Error creando OTP", {
        message: error.message,
        stack: error.stack,
      });

      const response = ResponseModel.internalError("Error al crear OTP");
      return response.send(res);
    }
  }
}

module.exports = OtpController;
