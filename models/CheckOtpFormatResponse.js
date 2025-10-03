class CheckOtpFormatResponse {
    constructor(data) {
        this.isValidOtp = data.isValidOtp;
    }

    static fromService(data) {
        return new CheckOtpFormatResponse(data);
    }

    toJSON() {
        return {
            isValidOtp: this.isValidOtp
        };
    }
}

module.exports = CheckOtpFormatResponse;

