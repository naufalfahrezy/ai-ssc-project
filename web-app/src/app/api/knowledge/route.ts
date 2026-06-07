import { NextRequest, NextResponse } from 'next/server';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabaseClient';

const pdfParse = require('pdf-parse/lib/pdf-parse.js');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPPORTED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
];

const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'csv'];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CHUNKS = 30;
const EMBEDDING_DIMENSION = 768;

function jsonResponse(data: Record<string, unknown>, status = 200) {
    return NextResponse.json(data, { status });
}

function getFileExtension(fileName: string) {
    return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function cleanText(text: string) {
    return text
        .replace(/\u0000/g, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

async function parsePdf(buffer: Buffer) {
    try {
        const result = await pdfParse(buffer);

        if (!result || typeof result.text !== 'string') {
            throw new Error('Hasil parsing PDF tidak valid.');
        }

        return result.text;
    } catch (error) {
        console.error('PDF parse error:', error);

        throw new Error(
            error instanceof Error
                ? `Gagal membaca PDF: ${error.message}`
                : 'Gagal membaca PDF.'
        );
    }
}

async function extractTextFromFile(file: File, buffer: Buffer) {
    const extension = getFileExtension(file.name);

    if (file.type === 'application/pdf' || extension === 'pdf') {
        return await parsePdf(buffer);
    }

    if (
        file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        extension === 'docx'
    ) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }

    if (
        file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        extension === 'xlsx'
    ) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        const sheetsText = workbook.SheetNames.map((sheetName: string) => {
            const worksheet = workbook.Sheets[sheetName];
            const csvText = XLSX.utils.sheet_to_csv(worksheet);

            return `Sheet: ${sheetName}\n${csvText}`;
        });

        return sheetsText.join('\n\n');
    }

    if (
        file.type === 'text/csv' ||
        file.type === 'application/csv' ||
        file.type === 'application/vnd.ms-excel' ||
        extension === 'csv'
    ) {
        return buffer.toString('utf-8');
    }

    throw new Error('Format file tidak didukung.');
}

export async function POST(req: NextRequest) {
    try {
        console.log('Knowledge API called');

        if (!process.env.GOOGLE_API_KEY) {
            return jsonResponse(
                {
                    success: false,
                    error: 'GOOGLE_API_KEY belum diset di Environment Variables.',
                },
                500
            );
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return jsonResponse(
                {
                    success: false,
                    error: 'File tidak ditemukan.',
                },
                400
            );
        }

        const extension = getFileExtension(file.name);

        const isSupported =
            SUPPORTED_TYPES.includes(file.type) ||
            SUPPORTED_EXTENSIONS.includes(extension);

        if (!isSupported) {
            return jsonResponse(
                {
                    success: false,
                    error:
                        'Format file belum didukung. Gunakan PDF, DOCX, XLSX, atau CSV.',
                    received_type: file.type || null,
                    received_extension: extension || null,
                },
                400
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return jsonResponse(
                {
                    success: false,
                    error: 'Ukuran file maksimal 10MB.',
                    file_size: file.size,
                },
                400
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const rawContent = await extractTextFromFile(file, buffer);
        const cleanContent = cleanText(rawContent);

        if (!cleanContent) {
            return jsonResponse(
                {
                    success: false,
                    error:
                        'File berhasil dibaca, tetapi tidak ditemukan teks yang bisa diproses.',
                },
                400
            );
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const allChunks = await splitter.splitText(cleanContent);
        const chunks = allChunks.slice(0, MAX_CHUNKS);

        if (chunks.length === 0) {
            return jsonResponse(
                {
                    success: false,
                    error: 'Konten file tidak menghasilkan chunk yang valid.',
                },
                400
            );
        }

        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GOOGLE_API_KEY,
            model: 'gemini-embedding-001',
            outputDimensionality: EMBEDDING_DIMENSION,
        } as any);

        const rows = [];

        for (let index = 0; index < chunks.length; index++) {
            const chunk = chunks[index];

            const rawEmbedding = await embeddings.embedQuery(chunk);

            if (!Array.isArray(rawEmbedding)) {
                throw new Error(
                    'Embedding gagal dibuat. Hasil embedding bukan array.'
                );
            }

            if (rawEmbedding.length < EMBEDDING_DIMENSION) {
                throw new Error(
                    `Dimensi embedding terlalu kecil. Dapat ${rawEmbedding.length}, minimal ${EMBEDDING_DIMENSION}.`
                );
            }

            const embedding = rawEmbedding.slice(0, EMBEDDING_DIMENSION);

            rows.push({
                file_name: file.name,
                file_url: null,
                content: chunk,
                embedding,
                metadata: {
                    source: file.name,
                    file_type: file.type || extension,
                    extension,
                    chunk_index: index,
                    chunk_size: chunk.length,
                    total_chunks: chunks.length,
                    original_total_chunks: allChunks.length,
                    is_limited: allChunks.length > MAX_CHUNKS,
                    embedding_model: 'gemini-embedding-001',
                    original_embedding_dimension: rawEmbedding.length,
                    stored_embedding_dimension: EMBEDDING_DIMENSION,
                },
                is_active: true,
            });
        }

        const { error } = await supabase.from('knowledge_base').insert(rows);

        if (error) {
            console.error('Supabase insert error:', error);

            return jsonResponse(
                {
                    success: false,
                    error: `Gagal menyimpan ke database: ${error.message}`,
                    details: error,
                },
                500
            );
        }

        return jsonResponse(
            {
                success: true,
                message: 'Dokumen berhasil diproses dan disimpan.',
                file_name: file.name,
                file_type: file.type || extension,
                chunks: chunks.length,
                original_total_chunks: allChunks.length,
                is_limited: allChunks.length > MAX_CHUNKS,
                stored_embedding_dimension: EMBEDDING_DIMENSION,
            },
            200
        );
    } catch (error) {
        console.error('Knowledge upload error:', error);

        return jsonResponse(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Gagal memproses dokumen knowledge base.',
            },
            500
        );
    }
}