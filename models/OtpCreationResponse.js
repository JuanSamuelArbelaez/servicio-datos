class OtpCreationResponse {
    constructor(data) {
        this.otp = data.otp;
    }

    static fromService(data) {
        return new OtpCreationResponse(data);
    }

    toJSON() {
        return {
            otp: this.otp
        };
    }
}

module.exports = OtpCreationResponse;
