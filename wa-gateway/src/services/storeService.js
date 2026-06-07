const fs = require('fs');
const path = require('path');

const dataDir = path.join(process.cwd(), 'data');
const settingsPath = path.join(dataDir, 'settings.json');
const keywordsPath = path.join(dataDir, 'keyword_replies.json');

const defaultSettings = {
    botEnabled: true,
    quoteReply: true,
    responseMode: 'private',
};

function ensureDataFiles() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(settingsPath)) {
        fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
    }

    if (!fs.existsSync(keywordsPath)) {
        fs.writeFileSync(keywordsPath, JSON.stringify([], null, 2));
    }
}

function readJson(filePath, fallback) {
    ensureDataFiles();

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
        return fallback;
    }
}

function writeJson(filePath, data) {
    ensureDataFiles();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getSettings() {
    return {
        ...defaultSettings,
        ...readJson(settingsPath, defaultSettings),
    };
}

function updateSettings(nextSettings) {
    const current = getSettings();

    const updated = {
        ...current,
        ...nextSettings,
        responseMode: ['private', 'group', 'both'].includes(nextSettings.responseMode)
            ? nextSettings.responseMode
            : current.responseMode,
    };

    writeJson(settingsPath, updated);
    return updated;
}

function getKeywords() {
    return readJson(keywordsPath, []);
}

function addKeyword(payload) {
    const keywords = getKeywords();

    const newKeyword = {
        id: Date.now().toString(),
        keyword: String(payload.keyword || '').trim(),
        reply: String(payload.reply || '').trim(),
        matchType: payload.matchType || 'contains',
        isActive: payload.isActive ?? true,
        createdAt: new Date().toISOString(),
    };

    if (!newKeyword.keyword || !newKeyword.reply) {
        throw new Error('Keyword and reply are required.');
    }

    const nextKeywords = [newKeyword, ...keywords];
    writeJson(keywordsPath, nextKeywords);

    return newKeyword;
}

function updateKeyword(id, payload) {
    const keywords = getKeywords();

    const nextKeywords = keywords.map((item) =>
        item.id === id
            ? {
                ...item,
                ...payload,
                keyword: payload.keyword !== undefined ? String(payload.keyword).trim() : item.keyword,
                reply: payload.reply !== undefined ? String(payload.reply).trim() : item.reply,
            }
            : item
    );

    writeJson(keywordsPath, nextKeywords);

    return nextKeywords.find((item) => item.id === id);
}

function deleteKeyword(id) {
    const keywords = getKeywords();
    const nextKeywords = keywords.filter((item) => item.id !== id);

    writeJson(keywordsPath, nextKeywords);

    return true;
}

function findKeywordReply(text) {
    const normalizedText = String(text || '').toLowerCase();
    const keywords = getKeywords().filter((item) => item.isActive);

    return keywords.find((item) => {
        const keyword = String(item.keyword || '').toLowerCase();

        if (item.matchType === 'exact') {
            return normalizedText === keyword;
        }

        return normalizedText.includes(keyword);
    });
}

module.exports = {
    getSettings,
    updateSettings,
    getKeywords,
    addKeyword,
    updateKeyword,
    deleteKeyword,
    findKeywordReply,
};