const { askSisca } = require('../services/chatService');
const { createTicket } = require('../services/ticketService');
const { saveFeedback } = require('../services/feedbackService');
const { upsertContact } = require('../services/contactService');
const { getSettings, findKeywordReply } = require('../services/storeService');
const {
    getWaSession,
    updateWaSession,
    resetWaSession,
} = require('../services/sessionService');

function getMessageText(message) {
    return (
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        message.message?.videoMessage?.caption ||
        ''
    );
}

function getChatType(jid) {
    if (typeof jid !== 'string') return 'unknown';

    if (jid === 'status@broadcast') return 'status';
    if (jid.endsWith('@s.whatsapp.net')) return 'private';
    if (jid.endsWith('@lid')) return 'private';
    if (jid.endsWith('@g.us')) return 'group';

    return 'unknown';
}

function cleanJid(jid) {
    return String(jid || '')
        .replace('@s.whatsapp.net', '')
        .replace('@lid', '')
        .replace('@g.us', '');
}

function getSessionKey(remoteJid) {
    return cleanJid(remoteJid);
}

function pickPossiblePhoneJid(message) {
    const candidates = [
        message?.key?.remoteJid,
        message?.key?.participant,
        message?.key?.participantPn,
        message?.key?.senderPn,
        message?.participant,
    ].filter(Boolean);

    const phoneJid = candidates.find((jid) =>
        String(jid).endsWith('@s.whatsapp.net')
    );

    return phoneJid || null;
}

function getSenderIdentity(message, remoteJid) {
    const phoneJid = pickPossiblePhoneJid(message);

    const waNumber = phoneJid ? cleanJid(phoneJid) : cleanJid(remoteJid);

    return {
        waNumber,
        waJid: remoteJid,
        isRealPhoneKnown: Boolean(
            phoneJid || String(remoteJid).endsWith('@s.whatsapp.net')
        ),
    };
}

function isAllowedByMode(chatType, responseMode) {
    if (responseMode === 'both') {
        return chatType === 'private' || chatType === 'group';
    }

    if (responseMode === 'private') {
        return chatType === 'private';
    }

    if (responseMode === 'group') {
        return chatType === 'group';
    }

    return false;
}

function formatForWhatsApp(text) {
    return String(text || '')
        // Markdown bold dari AI: **kata** → *kata* untuk WhatsApp
        .replace(/\*\*([^*]+)\*\*/g, '*$1*')
        .replace(/<\/?final_answer>/gi, '')
        .replace(/^\s*[-•]\s+/gm, '- ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function withActionFooter(reply) {
    return `${reply}

Untuk membuat laporan, ketik: *.lapor*
Untuk mengakhiri sesi, ketik: *selesai*`;
}

async function sendReply(sock, remoteJid, reply, originalMessage, quoteReply) {
    const formattedReply = formatForWhatsApp(reply);

    if (quoteReply) {
        return sock.sendMessage(
            remoteJid,
            { text: formattedReply },
            { quoted: originalMessage }
        );
    }

    return sock.sendMessage(remoteJid, { text: formattedReply });
}

function isCommand(text, command) {
    return text.trim().toLowerCase() === command;
}

function isLaporCommand(text) {
    return text.trim().toLowerCase().startsWith('.lapor ');
}

function parseLaporCommand(text) {
    return text.replace(/^\.lapor\s+/i, '').trim();
}

function isFeedbackFormat(text) {
    return /^\s*[1-5]\s*,\s*.+/i.test(text.trim());
}

function parseFeedback(text) {
    const match = text.match(/^\s*([1-5])\s*,\s*([\s\S]+)$/i);

    if (!match) return null;

    return {
        rating: Number(match[1]),
        message: String(match[2] || '').trim(),
    };
}

async function handleIncomingMessage(sock, message) {
    const remoteJid = message?.key?.remoteJid || '';
    const chatType = getChatType(remoteJid);
    const fromMe = !!message?.key?.fromMe;
    const text = getMessageText(message).trim();
    const pushName = message?.pushName || '-';

    console.log('='.repeat(80));
    console.log(`[WA][RAW] remoteJid=${remoteJid || '-'}`);
    console.log(`[WA][RAW] chatType=${chatType}`);
    console.log(`[WA][RAW] fromMe=${fromMe}`);
    console.log(`[WA][RAW] pushName=${pushName}`);
    console.log(`[WA][RAW] text=${text || '[non-text / empty]'}`);

    if (!message || !message.message) {
        console.log('[WA][SKIP] Message object is empty.');
        return;
    }

    if (fromMe) {
        console.log('[WA][SKIP] Message is from the connected bot account itself.');
        return;
    }

    if (chatType === 'status') {
        console.log('[WA][SKIP] Status broadcast ignored.');
        return;
    }

    if (chatType === 'unknown') {
        console.log('[WA][SKIP] Unknown chat type ignored.');
        return;
    }

    if (!text) {
        console.log('[WA][SKIP] Empty or unsupported message type.');
        return;
    }

    const settings = getSettings();
    const sessionKey = getSessionKey(remoteJid);
    const waSession = getWaSession(sessionKey);

    const sender = getSenderIdentity(message, remoteJid);
    const waNumber = sender.waNumber;
    const waJid = sender.waJid;

    const userName =
        message.pushName && message.pushName !== '.' ? message.pushName : waNumber;

    console.log(`[WA][IN] From: ${waNumber}`);
    console.log(`[WA][JID] ${waJid}`);
    console.log(`[WA][PHONE_KNOWN] ${sender.isRealPhoneKnown}`);
    console.log(`[WA][TYPE] ${chatType}`);
    console.log(`[WA][NAME] ${userName}`);
    console.log(`[WA][MESSAGE] ${text}`);
    console.log(
        `[WA][SETTING] botEnabled=${settings.botEnabled}, quoteReply=${settings.quoteReply}, responseMode=${settings.responseMode}`
    );
    console.log(
        `[WA][SESSION] step=${waSession.step}, sessionId=${waSession.sessionId || '-'}, hasConversation=${waSession.hasConversation}`
    );

    try {
        await upsertContact({
            waNumber,
            name: userName,
            waJid,
        });

        console.log('[WA][CONTACT] Contact saved/updated.');
    } catch (error) {
        console.warn('[WA][CONTACT] Failed to save contact:', error.message);
    }

    if (!settings.botEnabled) {
        console.log('[WA][SKIP] Chatbot is disabled. Message received but not replied.');
        return;
    }

    if (!isAllowedByMode(chatType, settings.responseMode)) {
        console.log(
            `[WA][SKIP] Response mode "${settings.responseMode}" does not allow ${chatType} chat.`
        );
        return;
    }

    try {
        await sock.sendPresenceUpdate('composing', remoteJid);

        if (isLaporCommand(text)) {
            const description = parseLaporCommand(text);

            if (!description) {
                await sendReply(
                    sock,
                    remoteJid,
                    'Format laporan belum lengkap. Gunakan format:\n\n*.lapor detail laporan*\n\nContoh:\n*.lapor Halo min, saya ada kendala saat mengajukan surat aktif kuliah.*',
                    message,
                    settings.quoteReply
                );
                await sock.sendPresenceUpdate('paused', remoteJid);
                return;
            }

            console.log('[WA][FLOW] Creating ticket from .lapor command.');

            await createTicket({
                name: userName,
                nim: '',
                waNumber,
                description,
            });

            const reply =
                'Tiket laporan berhasil dibuat. Staf SSC akan meninjau laporan Kakak pada jam kerja dan dapat menghubungi melalui WhatsApp yang digunakan.';

            console.log('[WA][OUT] Ticket created successfully.');

            await sendReply(sock, remoteJid, reply, message, settings.quoteReply);
            await sock.sendPresenceUpdate('paused', remoteJid);
            return;
        }

        if (isCommand(text, 'lapor')) {
            const reply =
                'Untuk membuat laporan, gunakan format:\n\n*.lapor detail laporan*\n\nContoh:\n*.lapor Halo min, saya ada kendala saat mengajukan surat aktif kuliah.*';

            await sendReply(sock, remoteJid, reply, message, settings.quoteReply);
            await sock.sendPresenceUpdate('paused', remoteJid);
            return;
        }

        if (isCommand(text, 'selesai')) {
            if (!waSession.hasConversation || !waSession.sessionId) {
                const reply =
                    'Belum ada sesi obrolan aktif yang bisa diakhiri, Kak. Silakan ajukan pertanyaan terlebih dahulu kepada Sisca.';

                console.log('[WA][FLOW] Finish requested without active conversation.');

                await sendReply(sock, remoteJid, reply, message, settings.quoteReply);
                await sock.sendPresenceUpdate('paused', remoteJid);
                return;
            }

            if (waSession.step === 'feedback') {
                const reply =
                    'Sisca masih menunggu feedback Kakak. Silakan kirim dengan format:\n\n*5, keren banget!*\n\nRating dapat diisi angka 1 sampai 5.';

                await sendReply(sock, remoteJid, reply, message, settings.quoteReply);
                await sock.sendPresenceUpdate('paused', remoteJid);
                return;
            }

            updateWaSession(sessionKey, {
                step: 'feedback',
                feedbackRequested: true,
                lastUserName: userName,
                lastWaNumber: waNumber,
                lastWaJid: waJid,
            });

            const feedbackPrompt =
                'Terima kasih sudah menggunakan Sisca. Sebelum sesi ditutup, mohon berikan feedback dengan format:\n\n*5, keren banget!*\n\nRating dapat diisi angka 1 sampai 5.';

            console.log('[WA][FLOW] Feedback requested.');

            await sendReply(sock, remoteJid, feedbackPrompt, message, settings.quoteReply);
            await sock.sendPresenceUpdate('paused', remoteJid);
            return;
        }

        if (waSession.step === 'feedback') {
            if (!isFeedbackFormat(text)) {
                const reply =
                    'Format feedback belum sesuai, Kak. Silakan kirim dengan format:\n\n*5, keren banget!*\n\nRating dapat diisi angka 1 sampai 5.';

                await sendReply(sock, remoteJid, reply, message, settings.quoteReply);
                await sock.sendPresenceUpdate('paused', remoteJid);
                return;
            }

            const feedback = parseFeedback(text);

            console.log('[WA][FLOW] Feedback received:', feedback);

            await saveFeedback({
                sessionId: waSession.sessionId,
                waNumber,
                rating: feedback.rating,
                message: feedback.message,
            });

            resetWaSession(sessionKey);

            const reply =
                'Terima kasih Kak, feedback sudah diterima. Masukan Kakak akan membantu evaluasi kualitas layanan Sisca.\n\nJika terdapat pertanyaan lain, jangan sungkan untuk kembali bertanya kepada Sisca ya.';

            await sendReply(sock, remoteJid, reply, message, settings.quoteReply);
            await sock.sendPresenceUpdate('paused', remoteJid);
            return;
        }

        const keywordReply = findKeywordReply(text);

        if (keywordReply) {
            const keywordFinalReply = withActionFooter(keywordReply.reply);

            console.log(`[WA][KEYWORD] Matched keyword: ${keywordReply.keyword}`);
            console.log(
                `[WA][OUT] ${keywordFinalReply.slice(0, 400)}${keywordFinalReply.length > 400 ? '...' : ''}`
            );

            await sendReply(sock, remoteJid, keywordFinalReply, message, settings.quoteReply);
            await sock.sendPresenceUpdate('paused', remoteJid);
            return;
        }

        console.log('[WA][RAG] Sending message to Sisca /api/chat...');

        const result = await askSisca({
            message: text,
            waNumber,
            userName,
            sessionId: waSession.sessionId,
        });

        updateWaSession(sessionKey, {
            step: 'chatting',
            sessionId: result.sessionId || waSession.sessionId,
            hasConversation: true,
            feedbackRequested: false,
            lastUserName: userName,
            lastWaNumber: waNumber,
            lastWaJid: waJid,
        });

        const finalReply = withActionFooter(result.reply);

        console.log(
            `[WA][RAG] Response received: ${finalReply.slice(0, 400)}${finalReply.length > 400 ? '...' : ''}`
        );

        await sendReply(sock, remoteJid, finalReply, message, settings.quoteReply);

        console.log(`[WA][OUT] Reply sent to ${waNumber}`);

        await sock.sendPresenceUpdate('paused', remoteJid);
    } catch (error) {
        console.error('[WA][ERROR] Failed to handle incoming message:', error.message);

        await sendReply(
            sock,
            remoteJid,
            'Maaf Kak, Sisca sedang mengalami kendala sistem. Silakan coba beberapa saat lagi.',
            message,
            settings.quoteReply
        );
    }
}

module.exports = {
    handleIncomingMessage,
};