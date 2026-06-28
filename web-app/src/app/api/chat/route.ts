import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

export const runtime = 'nodejs';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type BotSettings = {
    system_prompt: string;
    web_welcome: string;
    wa_welcome: string;
    office_hours: string;
    out_of_scope_message: string;
    temperature: number;
    max_output_tokens: number;
    match_threshold: number;
    match_count: number;
};


type SourceReference = {
    file_name: string;
    document_id: string | null;
    download_url: string | null;
};

const defaultBotSettings: BotSettings = {
    system_prompt:
        'Kamu adalah Sisca, Student Information & Service Center Assistant untuk Telkom University Surabaya. Jawab dengan ramah, jelas, profesional, dan hanya berdasarkan konteks knowledge base yang diberikan.',
    web_welcome:
        'Halo Kak! Aku Sisca, Student Information & Service Center Assistant Telkom University Surabaya. Ada informasi akademik atau layanan SSC yang ingin Kakak tanyakan hari ini?',
    wa_welcome:
        'Halo Kak, Sisca siap membantu informasi akademik TUS melalui WhatsApp.',
    office_hours: 'Monday - Friday, 08.00 - 16.00 WIB',
    out_of_scope_message:
        'Maaf Kak, informasi tersebut belum tersedia di knowledge base Sisca. Silakan buat tiket laporan agar staf SSC dapat menindaklanjuti.',
    temperature: 0.2,
    max_output_tokens: 900,
    match_threshold: 0.55,
    match_count: 5,
};

async function getBotSettings(): Promise<BotSettings> {
    const { data, error } = await supabaseAdmin
        .from('bot_settings')
        .select(
            'system_prompt,web_welcome,wa_welcome,office_hours,out_of_scope_message,temperature,max_output_tokens,match_threshold,match_count'
        )
        .eq('id', 'default')
        .single();

    if (error || !data) {
        console.warn('Using default bot settings:', error?.message);
        return defaultBotSettings;
    }

    return {
        system_prompt: data.system_prompt || defaultBotSettings.system_prompt,
        web_welcome: data.web_welcome || defaultBotSettings.web_welcome,
        wa_welcome: data.wa_welcome || defaultBotSettings.wa_welcome,
        office_hours: data.office_hours || defaultBotSettings.office_hours,
        out_of_scope_message:
            data.out_of_scope_message || defaultBotSettings.out_of_scope_message,
        temperature: Number(data.temperature ?? defaultBotSettings.temperature),
        max_output_tokens: Number(
            data.max_output_tokens ?? defaultBotSettings.max_output_tokens
        ),
        match_threshold: Number(
            data.match_threshold ?? defaultBotSettings.match_threshold
        ),
        match_count: Number(data.match_count ?? defaultBotSettings.match_count),
    };
}

function isGreetingOnly(message: string) {
    const normalized = message
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .replace(/\s+/g, ' ');

    return /^(hai|hi|halo|hallo|hello|pagi|siang|sore|malam|assalamualaikum|permisi)(\s+(min|admin|kak|sisca))?$/.test(
        normalized
    );
}

function normalizeSourceList(sources: string[]) {
    return Array.from(new Set(sources.filter(Boolean)));
}

function buildSourceReferences(docs: any[]): SourceReference[] {
    const sourceMap = new Map<string, SourceReference>();

    docs.forEach((doc) => {
        const fileName = String(doc.file_name || '').trim();
        if (!fileName) return;

        const documentId =
            typeof doc.document_id === 'string' && doc.document_id.trim()
                ? doc.document_id.trim()
                : null;

        const key = documentId || fileName;

        if (!sourceMap.has(key)) {
            sourceMap.set(key, {
                file_name: fileName,
                document_id: documentId,
                download_url: documentId
                    ? `/api/knowledge/download?id=${encodeURIComponent(documentId)}`
                    : null,
            });
        }
    });

    return Array.from(sourceMap.values());
}

async function enrichDocsWithDocumentId(docs: any[]) {
    const ids = docs
        .map((doc) => doc?.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

    if (ids.length === 0) return docs;

    const { data, error } = await supabaseAdmin
        .from('knowledge_base')
        .select('id, document_id, file_name')
        .in('id', ids);

    if (error) {
        console.warn('Failed to enrich knowledge sources:', error.message);
        return docs;
    }

    const documentMap = new Map(
        (data || []).map((row: any) => [
            row.id,
            {
                document_id: row.document_id || null,
                file_name: row.file_name || null,
            },
        ])
    );

    return docs.map((doc) => {
        const mapped = documentMap.get(doc.id);

        return {
            ...doc,
            document_id: doc.document_id || mapped?.document_id || null,
            file_name: doc.file_name || mapped?.file_name || null,
        };
    });
}

function cleanModelAnswer(answer: string) {
    let cleaned = answer.trim();

    const finalTagMatch = cleaned.match(/<final_answer>([\s\S]*?)<\/final_answer>/i);
    if (finalTagMatch?.[1]) {
        return finalTagMatch[1].trim();
    }

    const finalAnswerMarker = cleaned.match(/jawaban final\s*:/i);
    if (finalAnswerMarker?.index !== undefined) {
        cleaned = cleaned
            .slice(finalAnswerMarker.index + finalAnswerMarker[0].length)
            .trim();
    }

    const outOfScopeIndex = cleaned.lastIndexOf(
        'Maaf Kak, informasi tersebut belum tersedia'
    );

    if (outOfScopeIndex !== -1) {
        cleaned = cleaned.slice(outOfScopeIndex).trim();
    }

    cleaned = cleaned
        .replace(/^\s*persona\s*:[\s\S]*?(?=halo kak|maaf kak|berikut|informasi)/i, '')
        .replace(/^\s*rules\s*:[\s\S]*?(?=halo kak|maaf kak|berikut|informasi)/i, '')
        .replace(/^\s*analysis\s*:[\s\S]*?(?=halo kak|maaf kak|berikut|informasi)/i, '')
        .replace(/^\s*reasoning\s*:[\s\S]*?(?=halo kak|maaf kak|berikut|informasi)/i, '')
        .replace(/^\s*self-correction[\s\S]*?(?=halo kak|maaf kak|berikut|informasi)/i, '')
        .replace(/^\s*draft[\s\S]*?(?=halo kak|maaf kak|berikut|informasi)/i, '')
        .replace(/^\s*student question\s*:[\s\S]*?(?=halo kak|maaf kak|berikut|informasi)/i, '')
        .replace(/^\s*knowledge base content\s*:[\s\S]*?(?=halo kak|maaf kak|berikut|informasi)/i, '')
        .replace(/^\s*\*+\s*persona[\s\S]*?(?=halo kak|maaf kak|berikut|informasi)/i, '')
        .trim();

    cleaned = cleaned
        .replace(/<\/?final_answer>/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return cleaned;
}

async function generateGeminiAnswer(prompt: string, settings: BotSettings) {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        throw new Error('GOOGLE_API_KEY is not configured.');
    }

    const model = process.env.GEMINI_CHAT_MODEL || 'gemini-3.1-flash-lite';

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }],
                    },
                ],
                generationConfig: {
                    temperature: Number(settings.temperature),
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: Number(settings.max_output_tokens),
                },
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error('Gemini API error:', data);
        throw new Error(data?.error?.message || 'Gemini API request failed.');
    }

    return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Maaf Kak, Sisca belum dapat membuat jawaban saat ini.'
    );
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            message,
            source = 'web',
            userIdentifier,
            userName,
            sessionId,
        } = body;

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required.' },
                { status: 400 }
            );
        }

        const botSettings = await getBotSettings();

        const activeSessionId = await getOrCreateChatSession({
            sessionId,
            source,
            userIdentifier,
            userName,
        });

        if (isGreetingOnly(message)) {
            const greetingReply =
                source === 'whatsapp' ? botSettings.wa_welcome : botSettings.web_welcome;

            await saveChatSession({
                sessionId: activeSessionId,
                source,
                userIdentifier,
                userName,
                userMessage: message,
                botReply: greetingReply,
            });

            return NextResponse.json({
                reply: greetingReply,
                sessionId: activeSessionId,
                sources: [],
                matches: [],
            });
        }

        if (!process.env.GOOGLE_API_KEY) {
            throw new Error('GOOGLE_API_KEY is not configured.');
        }

        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GOOGLE_API_KEY,
            model: 'gemini-embedding-001',
            outputDimensionality: 768,
        } as any);

        const queryEmbeddingRaw = await embeddings.embedQuery(message);
        const queryEmbedding = queryEmbeddingRaw.slice(0, 768);

        const { data: matches, error: matchError } = await supabaseAdmin.rpc(
            'match_knowledge_base',
            {
                query_embedding: queryEmbedding,
                match_threshold: botSettings.match_threshold,
                match_count: botSettings.match_count,
            }
        );

        if (matchError) {
            console.error('Knowledge retrieval error:', matchError);

            return NextResponse.json(
                {
                    error: `Knowledge retrieval failed: ${matchError.message}`,
                },
                { status: 500 }
            );
        }

        const relevantDocs = await enrichDocsWithDocumentId(matches || []);

        if (relevantDocs.length === 0) {
            const fallbackReply = `${botSettings.out_of_scope_message}

Sumber referensi:
- Tidak ditemukan`;

            await saveChatSession({
                sessionId: activeSessionId,
                source,
                userIdentifier,
                userName,
                userMessage: message,
                botReply: fallbackReply,
            });

            return NextResponse.json({
                reply: fallbackReply,
                sessionId: activeSessionId,
                sources: [],
                matches: [],
            });
        }

        const context = relevantDocs
            .map((doc: any, index: number) => {
                return [
                    `Referensi ${index + 1}`,
                    `File: ${doc.file_name}`,
                    `Similarity: ${Number(doc.similarity).toFixed(4)}`,
                    `Content: ${doc.content}`,
                ].join('\n');
            })
            .join('\n\n---\n\n');

        const sourceReferences = buildSourceReferences(relevantDocs);
        const sourceList = normalizeSourceList(
            sourceReferences.map((source) => source.file_name)
        );

        const prompt = `
${botSettings.system_prompt}

TUGAS:
Jawab pertanyaan mahasiswa berdasarkan konteks knowledge base.

ATURAN WAJIB:
1. Output hanya boleh berisi jawaban final untuk mahasiswa.
2. Jangan tampilkan analisis, reasoning, self-correction, draft, checklist, evaluasi aturan, atau proses berpikir.
3. Jangan menulis ulang persona, rules, pertanyaan mahasiswa, atau isi knowledge base.
4. Jangan menulis tag <final_answer>.
5. Gunakan bahasa Indonesia yang ramah, singkat, jelas, dan profesional.
6. Jawab hanya berdasarkan konteks knowledge base yang diberikan.
7. Jika konteks tidak memuat jawaban relevan, gunakan Out-of-Scope Message.
8. Jangan mengarang tanggal, prosedur, biaya, link, kontak, atau aturan.
9. Jika pertanyaan terlalu umum, minta mahasiswa memperjelas layanan yang dimaksud.
10. Akhiri jawaban dengan format:
Sumber referensi:
- nama_file

Sebut Office Hours hanya jika mahasiswa menanyakan waktu operasional atau layanan yang memerlukan kehadiran staf SSC:
${botSettings.office_hours}

Out-of-Scope Message:
${botSettings.out_of_scope_message}

Pertanyaan mahasiswa:
${message}

Konteks knowledge base:
${context}

Daftar sumber:
${sourceList.map((source) => `- ${source}`).join('\n')}

Tulis hanya jawaban final untuk mahasiswa sekarang:
`;

        const aiAnswer = await generateGeminiAnswer(prompt, botSettings);
        const cleanedAnswer = cleanModelAnswer(aiAnswer);

        const finalReply = cleanedAnswer.includes('Sumber referensi:')
            ? cleanedAnswer
            : `${cleanedAnswer}

Sumber referensi:
${sourceList.map((source) => `- ${source}`).join('\n')}`;

        await saveChatSession({
            sessionId: activeSessionId,
            source,
            userIdentifier,
            userName,
            userMessage: message,
            botReply: finalReply,
        });

        return NextResponse.json({
            reply: finalReply,
            sessionId: activeSessionId,
            sources: sourceReferences,
            source_names: sourceList,
            matches: relevantDocs.map((doc: any) => ({
                id: doc.id,
                file_name: doc.file_name,
                document_id: doc.document_id || null,
                download_url: doc.document_id
                    ? `/api/knowledge/download?id=${encodeURIComponent(doc.document_id)}`
                    : null,
                similarity: doc.similarity,
            })),
        });
    } catch (error) {
        console.error('Chat API error:', error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Terjadi kesalahan pada server AI.',
            },
            { status: 500 }
        );
    }
}

async function saveChatSession({
    sessionId,
    source,
    userIdentifier,
    userName,
    userMessage,
    botReply,
}: {
    sessionId?: string | null;
    source: string;
    userIdentifier?: string;
    userName?: string;
    userMessage: string;
    botReply: string;
}) {
    if (!sessionId) return;

    const { data: currentSession } = await supabaseAdmin
        .from('chat_sessions')
        .select('chat_history')
        .eq('id', sessionId)
        .single();

    const currentHistory = Array.isArray(currentSession?.chat_history)
        ? currentSession.chat_history
        : [];

    const nextHistory = [
        ...currentHistory,
        { role: 'user', content: userMessage },
        { role: 'bot', content: botReply },
    ].slice(-40);

    const { error } = await supabaseAdmin
        .from('chat_sessions')
        .update({
            source,
            user_identifier: userIdentifier,
            user_name: userName,
            chat_history: nextHistory,
            updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

    if (error) {
        console.error('Failed to save chat session:', error);
    }
}

async function getOrCreateChatSession({
    sessionId,
    source,
    userIdentifier,
    userName,
}: {
    sessionId?: string | null;
    source: string;
    userIdentifier?: string;
    userName?: string;
}) {
    if (sessionId) return sessionId;

    if (!userIdentifier) return null;

    const { data: existingSession } = await supabaseAdmin
        .from('chat_sessions')
        .select('id')
        .eq('source', source)
        .eq('user_identifier', userIdentifier)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingSession?.id) {
        return existingSession.id;
    }

    const { data: newSession, error } = await supabaseAdmin
        .from('chat_sessions')
        .insert({
            source,
            user_identifier: userIdentifier,
            user_name: userName || userIdentifier,
            chat_history: [],
        })
        .select('id')
        .single();

    if (error) {
        console.error('Failed to create chat session:', error);
        return null;
    }

    return newSession?.id || null;
}