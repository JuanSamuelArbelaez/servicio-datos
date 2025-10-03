class Otp {
    constructor(data) {
        this.id = data.id;
        this.otp = data.otp;
        this.user_id = data.user_id;
        this.created_at = data.created_at;
        this.otp_status = data.otp_status;
    }

    // Crear instancia desde los datos de la BD
    static fromDatabase(data) {
        return new Otp(data);
    }

    // Convertir a objeto plano para JSON
    toJSON() {
        return {
            id: this.id,
            otp: this.otp,
            user_id: this.user_id,
            created_at: this.created_at,
            otp_status: this.otp_status
        };
    }
}

module.exports = Otp;
