class CheckOtpFormatRequest {
    constructor(data) {
        this.otp = data.otp;
    }

    static fromBody(data) {
        return new CheckOtpFormatRequest(data);
    }

    toJSON() {
        return {
            otp: this.otp
        };
    }
}

module.exports = CheckOtpFormatRequest;

