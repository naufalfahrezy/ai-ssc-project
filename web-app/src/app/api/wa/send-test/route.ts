import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const gatewayUrl = process.env.WA_GATEWAY_URL || 'http://localhost:4000';
    const adminSecret = process.env.WA_ADMIN_SECRET || 'sisca-secret-key';
    const body = await req.json();

    const response = await fetch(`${gatewayUrl}/send-test`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-secret': adminSecret,
        },
        body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}