import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
    const gatewayUrl = process.env.WA_GATEWAY_URL || 'http://localhost:4000';
    const adminSecret = process.env.WA_ADMIN_SECRET || 'sisca-secret-key';

    const response = await fetch(`${gatewayUrl}/logout`, {
        method: 'POST',
        headers: {
            'x-admin-secret': adminSecret,
        },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}