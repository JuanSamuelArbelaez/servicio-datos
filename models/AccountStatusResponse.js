class AccountStatusResponse  {
    constructor(data) {
        this.account_status = data.account_status;
    }

    static fromDatabase(data) {
        return new AccountStatusResponse(data);
    }

    toJSON() {
        return {
            account_status: this.account_status,
        };
    }
}

module.exports = AccountStatusResponse;