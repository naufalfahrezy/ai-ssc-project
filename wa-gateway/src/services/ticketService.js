const axios = require('axios');

const WEB_APP_BASE_URL =
    process.env.WEB_APP_BASE_URL || 'http://localhost:3000';

async function createTicket({ name, nim, waNumber, description }) {
    const response = await axios.post(
        `${WEB_APP_BASE_URL}/api/wa/ticket`,
        {
            name,
            nim,
            waNumber,
            description,
        },
        {
            timeout: 30000,
        }
    );

    return response.data;
}

module.exports = {
    createTicket,
};