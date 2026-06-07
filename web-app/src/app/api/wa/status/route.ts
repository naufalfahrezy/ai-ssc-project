import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const gatewayUrl = process.env.WA_GATEWAY_URL || 'http://localhost:4000';

        const response = await fetch(`${gatewayUrl}/status`, {
            cache: 'no-store',
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                {
                    connected: false,
                    message: data?.message || 'Failed to read WhatsApp gateway status.',
                },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json(
            {
                connected: false,
                message:
                    error instanceof Error
                        ? error.message
                        : 'Unable to reach WhatsApp gateway.',
            },
            { status: 500 }
        );
    }
}