require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const P = require('pino');
const {
    getSettings,
    updateSettings,
    getKeywords,
    addKeyword,
    updateKeyword,
    deleteKeyword,
} = require('./services/storeService');

const {
    default: makeWASocket,
    DisconnectReason,
    fetchLatestBaileysVersion,
    useMultiFileAuthState,
} = require('@whiskeysockets/baileys');

const { handleIncomingMessage } = require('./handlers/messageHandler');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 4000);
const WA_ADMIN_SECRET = process.env.WA_ADMIN_SECRET || 'sisca-secret-key';

let sock = null;
let latestQrText = null;
let latestQrDataUrl = null;
let isConnected = false;
let connectedPhone = null;
let lastConnectionMessage = 'WhatsApp gateway not started yet.';
let isStarting = false;

const authFolderPath = path.join(process.cwd(), 'auth_info_baileys');

function deleteAuthSessionFolder() {
    try {
        if (fs.existsSync(authFolderPath)) {
            fs.rmSync(authFolderPath, {
                recursive: true,
                force: true,
            });

            console.log('[WA] Auth session folder deleted.');
        }
    } catch (error) {
        console.error('[WA] Failed to delete auth session folder:', error.message);
    }
}

function normalizeWaNumber(number) {
    const cleaned = String(number || '').replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
        return `62${cleaned.slice(1)}`;
    }

    if (cleaned.startsWith('62')) {
        return cleaned;
    }

    return cleaned;
}

function toJid(number) {
    return `${normalizeWaNumber(number)}@s.whatsapp.net`;
}

function requireAdminSecret(req, res, next) {
    const secret = req.headers['x-admin-secret'];

    if (secret !== WA_ADMIN_SECRET) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized request.',
        });
    }

    next();
}

async function startWhatsApp() {
    if (isStarting) return;

    isStarting = true;

    try {
        const { state, saveCreds } = await useMultiFileAuthState(
            'auth_info_baileys'
        );

        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: true,
            logger: P({ level: 'silent' }),
            browser: ['Sisca Platform', 'Chrome', '1.0.0'],
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                latestQrText = qr;
                latestQrDataUrl = await QRCode.toDataURL(qr, {
                    margin: 2,
                    width: 440,
                });

                isConnected = false;
                connectedPhone = null;
                lastConnectionMessage = 'QR code generated. Please scan from WhatsApp.';

                console.log('[WA] QR updated. Open admin WhatsApp Integration page.');
            }

            if (connection === 'open') {
                isConnected = true;
                latestQrText = null;
                latestQrDataUrl = null;

                const user = sock?.user;
                connectedPhone = user?.id?.split(':')?.[0] || user?.id || null;
                lastConnectionMessage = 'WhatsApp connected successfully.';

                console.log('[WA] Connected:', connectedPhone);
            }

            if (connection === 'close') {
                isConnected = false;
                connectedPhone = null;

                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                lastConnectionMessage = shouldReconnect
                    ? 'Connection closed. Reconnecting...'
                    : 'Logged out. Please scan QR again.';

                console.log('[WA] Connection closed:', lastConnectionMessage);

                if (shouldReconnect) {
                    setTimeout(() => {
                        startWhatsApp().catch(console.error);
                    }, 2500);
                }
            }
        });

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            console.log(`[WA][EVENT] messages.upsert type=${type}, count=${messages?.length || 0}`);

            if (!messages?.length) return;

            for (const message of messages) {
                await handleIncomingMessage(sock, message);
            }
        });
    } catch (error) {
        console.error('[WA] Failed to start WhatsApp gateway:', error);
        lastConnectionMessage = 'Failed to start WhatsApp gateway.';
    } finally {
        isStarting = false;
    }
}

app.get('/', (_req, res) => {
    res.json({
        service: 'Sisca WhatsApp Gateway',
        status: 'running',
        port: PORT,
    });
});

app.get('/status', (_req, res) => {
    res.json({
        connected: isConnected,
        phone: connectedPhone,
        qr: latestQrDataUrl,
        message: lastConnectionMessage,
        settings: getSettings(),
        keywords_count: getKeywords().length,
    });
});

app.get('/qr', (_req, res) => {
    res.json({
        connected: isConnected,
        qr: latestQrDataUrl,
        qrText: latestQrText,
    });
});

app.post('/restart', requireAdminSecret, async (_req, res) => {
    try {
        lastConnectionMessage = 'Restarting WhatsApp gateway...';

        if (sock) {
            sock.end(undefined);
            sock = null;
        }

        isConnected = false;
        connectedPhone = null;
        latestQrText = null;
        latestQrDataUrl = null;

        await startWhatsApp();

        return res.json({
            success: true,
            message: 'WhatsApp gateway restarted.',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to restart WhatsApp gateway.',
        });
    }
});

app.post('/logout', requireAdminSecret, async (_req, res) => {
    try {
        lastConnectionMessage = 'Logging out WhatsApp session...';

        if (sock) {
            try {
                await sock.logout();
            } catch (error) {
                console.warn('[WA] Logout warning:', error.message);
            }

            try {
                sock.end(undefined);
            } catch (error) {
                console.warn('[WA] Socket end warning:', error.message);
            }

            sock = null;
        }

        latestQrText = null;
        latestQrDataUrl = null;
        isConnected = false;
        connectedPhone = null;
        isStarting = false;

        deleteAuthSessionFolder();

        lastConnectionMessage = 'Session removed. Generating new QR code...';

        setTimeout(() => {
            startWhatsApp().catch((error) => {
                console.error('[WA] Failed to restart after logout:', error);
            });
        }, 1000);

        return res.json({
            success: true,
            message: 'WhatsApp session logged out and session folder deleted. New QR will be generated shortly.',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to logout WhatsApp session.',
        });
    }
});

app.post('/send-test', requireAdminSecret, async (req, res) => {
    try {
        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({
                success: false,
                message: 'Fields "to" and "message" are required.',
            });
        }

        if (!sock || !isConnected) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp is not connected.',
            });
        }

        const jid = toJid(to);

        await sock.sendMessage(jid, {
            text: message,
        });

        return res.json({
            success: true,
            message: 'Test message sent successfully.',
            to: jid,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to send test message.',
        });
    }
});

app.get('/settings', (_req, res) => {
    res.json({
        success: true,
        settings: getSettings(),
    });
});

app.patch('/settings', requireAdminSecret, (req, res) => {
    try {
        const settings = updateSettings(req.body || {});

        res.json({
            success: true,
            settings,
            message: 'WhatsApp settings updated.',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update settings.',
        });
    }
});

app.get('/keywords', (_req, res) => {
    res.json({
        success: true,
        keywords: getKeywords(),
    });
});

app.post('/keywords', requireAdminSecret, (req, res) => {
    try {
        const keyword = addKeyword(req.body || {});

        res.json({
            success: true,
            keyword,
            message: 'Keyword reply created.',
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create keyword reply.',
        });
    }
});

app.patch('/keywords/:id', requireAdminSecret, (req, res) => {
    try {
        const keyword = updateKeyword(req.params.id, req.body || {});

        res.json({
            success: true,
            keyword,
            message: 'Keyword reply updated.',
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update keyword reply.',
        });
    }
});

app.delete('/keywords/:id', requireAdminSecret, (req, res) => {
    try {
        deleteKeyword(req.params.id);

        res.json({
            success: true,
            message: 'Keyword reply deleted.',
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to delete keyword reply.',
        });
    }
});

app.post('/reset-session', requireAdminSecret, async (_req, res) => {
    try {
        lastConnectionMessage = 'Resetting WhatsApp session...';

        if (sock) {
            try {
                sock.end(undefined);
            } catch (error) {
                console.warn('[WA] Socket end warning:', error.message);
            }

            sock = null;
        }

        latestQrText = null;
        latestQrDataUrl = null;
        isConnected = false;
        connectedPhone = null;
        isStarting = false;

        deleteAuthSessionFolder();

        await startWhatsApp();

        return res.json({
            success: true,
            message: 'WhatsApp session reset. New QR code is being generated.',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to reset WhatsApp session.',
        });
    }
});

app.listen(PORT, async () => {
    console.log(`WA Gateway running on http://localhost:${PORT}`);
    await startWhatsApp();
});