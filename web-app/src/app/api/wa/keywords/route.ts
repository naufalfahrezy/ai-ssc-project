import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const gatewayUrl = process.env.WA_GATEWAY_URL || 'http://localhost:4000';
const adminSecret = process.env.WA_ADMIN_SECRET || 'sisca-secret-key';

export async function GET() {
    const response = await fetch(`${gatewayUrl}/keywords`, { cache: 'no-store' });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}

export async function POST(req: NextRequest) {
    const body = await req.json();

    const response = await fetch(`${gatewayUrl}/keywords`, {
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