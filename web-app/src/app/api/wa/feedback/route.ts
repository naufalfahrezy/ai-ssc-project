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

        const { sessionId, waNumber, rating, message } = body;

        if (!rating || Number(rating) < 1 || Number(rating) > 5) {
            return NextResponse.json(
                { error: 'Rating must be between 1 and 5.' },
                { status: 400 }
            );
        }

        let targetSessionId = sessionId;

        if (!targetSessionId && waNumber) {
            const { data } = await supabaseAdmin
                .from('chat_sessions')
                .select('id')
                .eq('source', 'whatsapp')
                .eq('user_identifier', waNumber)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            targetSessionId = data?.id || null;
        }

        if (!targetSessionId) {
            return NextResponse.json(
                { error: 'Chat session not found.' },
                { status: 404 }
            );
        }

        const { error } = await supabaseAdmin
            .from('chat_sessions')
            .update({
                rating: Number(rating),
                feedback_message: message || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', targetSessionId);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Feedback saved successfully.',
        });
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : 'Failed to save feedback.',
            },
            { status: 500 }
        );
    }
}