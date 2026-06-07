import { NextRequest, NextResponse } from 'next/server';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabaseClient';

export const runtime = 'nodejs';

const SUPPORTED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
];

function getFileExtension(fileName: string) {
    return fileName.split('.').pop()?.toLowerCase() ?? '';
}

async function extractTextFromFile(file: File, buffer: Buffer) {
    const extension = getFileExtension(file.name);

    if (file.type === 'application/pdf' || extension === 'pdf') {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy();
        return result.text;
    }

    if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        extension === 'docx'
    ) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }

    if (
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        extension === 'xlsx'
    ) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        const sheetsText = workbook.SheetNames.map((sheetName: string) => {
            const worksheet = workbook.Sheets[sheetName];
            const csvText = XLSX.utils.sheet_to_csv(worksheet);

            return [
                `Sheet: ${sheetName}`,
                csvText,
            ].join('\n');
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
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { error: 'File tidak ditemukan.' },
                { status: 400 }
            );
        }

        const extension = getFileExtension(file.name);

        const isSupported =
            SUPPORTED_TYPES.includes(file.type) ||
            ['pdf', 'docx', 'xlsx', 'csv'].includes(extension);

        if (!isSupported) {
            return NextResponse.json(
                {
                    error: 'Format file belum didukung. Gunakan PDF, DOCX, XLSX, atau CSV.',
                },
                { status: 400 }
            );
        }

        const maxSize = 10 * 1024 * 1024;

        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'Ukuran file maksimal 10MB.' },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const content = await extractTextFromFile(file, buffer);
        const cleanContent = content
            .replace(/\u0000/g, '')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (!cleanContent) {
            return NextResponse.json(
                {
                    error:
                        'File berhasil dibaca, tetapi tidak ditemukan teks yang bisa diproses.',
                },
                { status: 400 }
            );
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const chunks = await splitter.splitText(cleanContent);

        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GOOGLE_API_KEY!,
            model: 'gemini-embedding-001',
            outputDimensionality: 768,
        } as any);

        const rows = [];

        for (let index = 0; index < chunks.length; index++) {
            const chunk = chunks[index];

            const embedding3072 = await embeddings.embedQuery(chunk);
            const embedding = embedding3072.slice(0, 768);

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
                    embedding_model: 'gemini-embedding-001',
                    embedding_dimension: 768,
                },
                is_active: true,
            });
        }

        const { error } = await supabase.from('knowledge_base').insert(rows);

        if (error) {
            console.error('Supabase insert error:', error);
            return NextResponse.json(
                { error: `Gagal menyimpan ke database: ${error.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'Dokumen berhasil diproses dan disimpan.',
            file_name: file.name,
            file_type: file.type || extension,
            chunks: chunks.length,
        });
    } catch (error) {
        console.error('Knowledge upload error:', error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Gagal memproses dokumen knowledge base.',
            },
            { status: 500 }
        );
    }
}