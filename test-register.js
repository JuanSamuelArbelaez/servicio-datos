const axios = require('axios');

const BASE_URL = 'http://localhost:8082';

async function testUserRegistration() {
    console.log('🧪 Testing User Registration API...\n');

    try {
        // Test 1: Registrar usuario válido
        console.log('📝 Test 1: Registrar usuario válido');
        const validUser = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123'
        };

        const response1 = await axios.post(`${BASE_URL}/api/users/register`, validUser);
        console.log('✅ Usuario registrado exitosamente:', response1.data);
        console.log('');

        // Test 2: Intentar registrar el mismo email (debería fallar con 409)
        console.log('📝 Test 2: Intentar registrar email duplicado');
        try {
            await axios.post(`${BASE_URL}/api/users/register`, validUser);
        } catch (error) {
            if (error.response && error.response.status === 409) {
                console.log('✅ Error 409 capturado correctamente para email duplicado');
            } else {
                console.log('❌ Error inesperado:', error.response?.data);
            }
        }
        console.log('');

        // Test 3: Validar endpoint de salud
        console.log('📝 Test 3: Endpoint de salud del controlador');
        const healthResponse = await axios.get(`${BASE_URL}/api/users/health`);
        console.log('✅ Health check exitoso:', healthResponse.data);
        console.log('');

        // Test 4: Validar endpoint de salud del sistema
        console.log('📝 Test 4: Endpoint de salud del sistema');
        const systemHealthResponse = await axios.get(`${BASE_URL}/actuator/health`);
        console.log('✅ System health check exitoso:', systemHealthResponse.data);

    } catch (error) {
        console.error('❌ Error en las pruebas:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
    }
}

// Ejecutar pruebas
testUserRegistration();
