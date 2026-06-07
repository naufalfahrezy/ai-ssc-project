const axios = require('axios');

const WEB_APP_BASE_URL =
    process.env.WEB_APP_BASE_URL || 'http://localhost:3000';

async function saveFeedback({ sessionId, waNumber, rating, message }) {
    const response = await axios.post(
        `${WEB_APP_BASE_URL}/api/wa/feedback`,
        {
            sessionId,
            waNumber,
            rating,
            message,
        },
        {
            timeout: 30000,
        }
    );

    return response.data;
}

module.exports = {
    saveFeedback,
};