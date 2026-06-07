const axios = require('axios');

const WEB_APP_CHAT_API =
    process.env.WEB_APP_CHAT_API || 'http://localhost:3000/api/chat';

async function askSisca({ message, waNumber, userName, sessionId }) {
    console.log('[WA][API] Sending to Sisca API:', {
        waNumber,
        userName,
        sessionId,
        message,
    });

    const response = await axios.post(
        WEB_APP_CHAT_API,
        {
            message,
            source: 'whatsapp',
            userIdentifier: waNumber,
            userName: userName || waNumber,
            sessionId: sessionId || null,
        },
        {
            timeout: 60000,
        }
    );

    return {
        reply:
            response.data?.reply ||
            'Maaf Kak, Sisca belum dapat membuat jawaban saat ini.',
        sessionId: response.data?.sessionId || sessionId || null,
        sources: response.data?.sources || [],
    };
}

module.exports = {
    askSisca,
};