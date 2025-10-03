class UserUpdate {
    constructor(data) {
        this.email = data.email;
        this.name = data.name;
        this.phone = data.phone;
    }


    // Convertir a objeto plano
    toJSON() {
        return {
            email: this.email,
            name: this.name,
            phone: this.phone
        };
    }
}

module.exports = UserUpdate;
