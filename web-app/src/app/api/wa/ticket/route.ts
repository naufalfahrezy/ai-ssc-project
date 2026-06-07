import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const { name, nim, waNumber, description } = body;

        if (!name || !waNumber || !description) {
            return NextResponse.json(
                { error: 'Name, WhatsApp number, and description are required.' },
                { status: 400 }
            );
        }

        const issueDescription = [
            nim ? `NIM: ${nim}` : 'NIM: -',
            '',
            `Deskripsi Kendala: ${description}`,
        ].join('\n');

        const { error } = await supabaseAdmin.from('tickets').insert({
            pelapor_name: name,
            pelapor_wa: waNumber,
            issue_description: issueDescription,
            status: 'pending',
        });

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            message: 'Ticket created successfully.',
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to create WhatsApp ticket.',
            },
            { status: 500 }
        );
    }
}