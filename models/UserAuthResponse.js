class UserAuthResponse {
    constructor(user) {
        this.id = user.id;
        this.email = user.email;
        this.name = user.name;
        this.phone = user.phone;
        this.password = user.password; // Incluir password para autenticación
    }

    // Convertir a objeto plano para respuesta JSON
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
            phone: this.phone,
            password: this.password
        };
    }

    // Método estático para crear desde un User
    static fromUser(user) {
        return new UserAuthResponse(user);
    }
}

module.exports = UserAuthResponse;

