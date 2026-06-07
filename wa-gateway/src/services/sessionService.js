const fs = require('fs');
const path = require('path');

const dataDir = path.join(process.cwd(), 'data');
const sessionPath = path.join(dataDir, 'wa_sessions.json');

function ensureFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(sessionPath)) {
        fs.writeFileSync(sessionPath, JSON.stringify({}, null, 2));
    }
}

function readSessions() {
    ensureFile();

    try {
        return JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    } catch {
        return {};
    }
}

function writeSessions(data) {
    ensureFile();
    fs.writeFileSync(sessionPath, JSON.stringify(data, null, 2));
}

function getDefaultSession() {
    return {
        step: 'idle',
        sessionId: null,
        hasConversation: false,
        feedbackRequested: false,
        lastUserName: null,
        lastWaNumber: null,
        lastWaJid: null,
        lastUpdatedAt: null,
    };
}

function getWaSession(key) {
    const sessions = readSessions();
    return sessions[key] || getDefaultSession();
}

function updateWaSession(key, nextData) {
    const sessions = readSessions();
    const current = getWaSession(key);

    const updated = {
        ...current,
        ...nextData,
        lastUpdatedAt: new Date().toISOString(),
    };

    sessions[key] = updated;
    writeSessions(sessions);

    return updated;
}

function resetWaSession(key) {
    const sessions = readSessions();

    sessions[key] = {
        ...getDefaultSession(),
        lastUpdatedAt: new Date().toISOString(),
    };

    writeSessions(sessions);

    return sessions[key];
}

module.exports = {
    getWaSession,
    updateWaSession,
    resetWaSession,
};