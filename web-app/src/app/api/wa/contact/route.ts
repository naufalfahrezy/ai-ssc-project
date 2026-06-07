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

        const { waNumber, name, waJid } = body;

        if (!waNumber) {
            return NextResponse.json(
                { error: 'WhatsApp number or identifier is required.' },
                { status: 400 }
            );
        }

        const { error } = await supabaseAdmin.from('wa_contacts').upsert(
            {
                wa_number: waNumber,
                name: name || waNumber,
                last_interaction: new Date().toISOString(),
                is_bot_active: true,
            },
            { onConflict: 'wa_number' }
        );

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'WhatsApp contact saved.',
            waNumber,
            waJid,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to save WhatsApp contact.',
            },
            { status: 500 }
        );
    }
}