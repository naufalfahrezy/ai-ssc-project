import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const gatewayUrl = process.env.WA_GATEWAY_URL || 'http://localhost:4000';
const adminSecret = process.env.WA_ADMIN_SECRET || 'sisca-secret-key';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await req.json();

    const response = await fetch(`${gatewayUrl}/keywords/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-secret': adminSecret,
        },
        body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const response = await fetch(`${gatewayUrl}/keywords/${id}`, {
        method: 'DELETE',
        headers: {
            'x-admin-secret': adminSecret,
        },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}