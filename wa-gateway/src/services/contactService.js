const axios = require('axios');

const WEB_APP_BASE_URL =
    process.env.WEB_APP_BASE_URL || 'http://localhost:3000';

async function upsertContact({ waNumber, name, waJid }) {
    const response = await axios.post(
        `${WEB_APP_BASE_URL}/api/wa/contact`,
        {
            waNumber,
            name,
            waJid,
        },
        {
            timeout: 30000,
        }
    );

    return response.data;
}

module.exports = {
    upsertContact,
};