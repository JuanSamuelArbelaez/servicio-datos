class OtpResponse {
    constructor(otp) {
        this.id = otp.id;
        this.otp = otp.otp;
        this.user_id = otp.user_id;
        this.created_at = otp.created_at;
        this.otp_status = otp.otp_status;
        this.url = "";
    }

    // Convertir a objeto plano para JSON
    toJSON() {
        return {
            id: this.id,
            otp: this.otp,
            user_id: this.user_id,
            created_at: this.created_at,
            otp_status: this.otp_status,
            url: this.url,
        };
    }

    //
    static fromOtp(otp) {
        return new OtpResponse(otp);
    }
}

module.exports = OtpResponse;
