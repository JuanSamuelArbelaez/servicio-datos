class UserRegister {
    constructor(data) {
        this.email = data.email;
        this.password = data.password;
        this.name = data.name;
        this.phone = data.phone;
    }


    // Convertir a objeto plano
    toJSON() {
        return {
            email: this.email,
            password: this.password,
            name: this.name,
            phone: this.phone
        };
    }
}

module.exports = UserRegister;
