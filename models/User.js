class User {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.email = data.email;
        this.password = data.password;
        this.created_at = data.created_at;
        this.phone = data.phone;
        this.account_status = data.account_status;
    }

    // Método estático para crear una instancia desde los datos de la BD
    static fromDatabase(data) {
        return new User(data);
    }

    // Método para convertir a objeto plano (útil para respuestas JSON)
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            phone: this.phone,
            created_at: this.created_at,
            account_status: this.account_status
        };
    }

}

module.exports = User;
