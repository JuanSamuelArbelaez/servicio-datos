const pool = require("../config/database");
const logger = require("../logger/Logger");

class ProfileRepository {
    /**
     * CREATE - Crear un nuevo perfil para un usuario
     * @param {number} userId - ID del usuario
     * @returns {Promise<Object>} Perfil creado
     * @throws {Error} Si hay un error en la base de datos
     */
    async create(userId) {
        logger.info("[ProfileRepository]", "Intentando crear nuevo perfil", { userId });

        try {
            const query = `
                INSERT INTO profiles (user_id)
                VALUES ($1)
                RETURNING *
            `;
            const values = [userId];
            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                logger.error("[ProfileRepository]", "Error inesperado: no se devolvió perfil tras INSERT", { userId });
                throw new Error("Error al crear el perfil, sin datos devueltos");
            }

            const createdProfile = result.rows[0];
            logger.info("[ProfileRepository]", "Perfil creado exitosamente", { id: createdProfile.id, userId });
            return createdProfile;

        } catch (error) {
            logger.error("[ProfileRepository]", "Error creando perfil", { userId, error: error.message });
            throw error;
        }
    }

    /**
     * READ - Obtener perfil por user_id
     * @param {number} userId - ID del usuario
     * @returns {Promise<Object|null>} Perfil encontrado o null si no existe
     */
    async findByUserId(userId) {
        logger.info("[ProfileRepository]", "Buscando perfil por user_id", { userId });

        try {
            const query = `
                SELECT * FROM profiles
                WHERE user_id = $1
            `;
            const result = await pool.query(query, [userId]);

            if (result.rows.length === 0) {
                logger.debug("[ProfileRepository]", "Perfil no encontrado", { userId });
                return null;
            }

            logger.info("[ProfileRepository]", "Perfil encontrado", { userId, profileId: result.rows[0].id });
            return result.rows[0];

        } catch (error) {
            logger.error("[ProfileRepository]", "Error buscando perfil", { userId, error: error.message });
            throw error;
        }
    }
}

module.exports = ProfileRepository;

