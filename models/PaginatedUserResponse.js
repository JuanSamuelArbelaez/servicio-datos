/**
 * Modelo para respuestas paginadas de usuarios
 */
class PaginatedUserResponse {
    /**
     * Constructor del modelo
     * @param {number} totalItems - Total de usuarios en la base de datos
     * @param {number} totalPages - Total de páginas disponibles
     * @param {number} currentPage - Página actual
     * @param {number} pageSize - Tamaño de cada página
     * @param {Array} users - Lista de usuarios de la página actual
     */
    constructor(totalItems, totalPages, currentPage, pageSize, users) {
        this.totalItems = totalItems;
        this.totalPages = totalPages;
        this.currentPage = currentPage;
        this.pageSize = pageSize;
        this.users = users;
    }

    /**
     * Crea una instancia desde datos de base de datos
     * @param {Object} data - Datos de la respuesta paginada
     * @param {number} data.totalItems - Total de usuarios
     * @param {number} data.totalPages - Total de páginas
     * @param {number} data.currentPage - Página actual
     * @param {number} data.pageSize - Tamaño de página
     * @param {Array} data.users - Lista de usuarios
     * @returns {PaginatedUserResponse} Instancia del modelo
     */
    static fromData(data) {
        return new PaginatedUserResponse(
            data.totalItems,
            data.totalPages,
            data.currentPage,
            data.pageSize,
            data.users
        );
    }

    /**
     * Crea una instancia calculando automáticamente los valores de paginación
     * @param {Array} users - Lista de usuarios de la página actual
     * @param {number} totalItems - Total de usuarios en la base de datos
     * @param {number} currentPage - Página actual (base 1)
     * @param {number} pageSize - Tamaño de cada página
     * @returns {PaginatedUserResponse} Instancia del modelo
     */
    static createPaginated(users, totalItems, currentPage, pageSize) {
        const totalPages = Math.ceil(totalItems / pageSize);
        
        return new PaginatedUserResponse(
            totalItems,
            totalPages,
            currentPage,
            pageSize,
            users
        );
    }

    /**
     * Convierte el modelo a un objeto plano para respuesta JSON
     * @returns {Object} Objeto plano con los datos de paginación
     */
    toJSON() {
        return {
            totalItems: this.totalItems,
            totalPages: this.totalPages,
            currentPage: this.currentPage,
            pageSize: this.pageSize,
            users: this.users
        };
    }
}

module.exports = PaginatedUserResponse;

