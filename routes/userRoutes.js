const express = require('express');
const UserControllerDB = require('../controllers/userControllerDB');

const router = express.Router();
const userController = new UserControllerDB();

// Middleware para parsear JSON
router.use(express.json());

/**
 * @route   POST /api/users/register
 * @desc    Registrar un nuevo usuario
 * @access  Public
 */
router.post('/register', userController.registerUser.bind(userController));

/**
 * @route   PUT /api/users/:id
 * @desc    Actualizar un usuario existente
 * @access  Public
 */
router.put('/:id', userController.updateUser.bind(userController));

/**
 * @route   GET /api/users
 * @desc    Obtener todos los usuarios paginados
 * @access  Public
 */
router.get('/', userController.getAllUsersPaginated.bind(userController));

/**
 * @route   GET /api/users/email
 * @desc    Obtener un usuario específico por email
 * @access  Public
 */
router.get('/email', (req, res) => userController.getUserByEmail(req, res));

/**
 * @route   GET /api/users/:id
 * @desc    Obtener un usuario específico por ID
 * @access  Public
 */
router.get('/:id', userController.getUserById.bind(userController));

/**
 * @route   DELETE /api/users/:id
 * @desc    Eliminar lógicamente un usuario (soft delete)
 * @access  Public
 */
router.delete('/:id', userController.deleteUser.bind(userController));

/**
 * @route   PATCH /api/users/:id/password
 * @desc    Actualizar la contraseña de un usuario
 * @access  Public
 */
router.patch('/:id/password', userController.updatePassword.bind(userController));

/**
 * @route   PATCH /api/users/:id/account_status
 * @desc    Verificar el usuario
 * @access  Public
 */
router.patch('/:id/account_status', userController.verifyUserAccount.bind(userController));

module.exports = router;
