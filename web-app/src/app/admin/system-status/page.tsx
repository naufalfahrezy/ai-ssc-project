'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Activity, CheckCircle2, Database, RefreshCw, Server, WifiOff } from 'lucide-react';

type CheckItem = { name: string; status: 'active' | 'warning' | 'down'; detail: string; icon: any };

export default function SystemStatusPage() {
    const [checks, setChecks] = useState<CheckItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const runChecks = async () => {
        setIsLoading(true);
        const next: CheckItem[] = [];

        try {
            const { error } = await supabase.from('knowledge_base').select('id', { head: true, count: 'exact' });
            next.push({ name: 'Supabase Database', status: error ? 'down' : 'active', detail: error ? error.message : 'Database connection is reachable.', icon: Database });
        } catch (error: any) {
            next.push({ name: 'Supabase Database', status: 'down', detail: error.message || 'Database check failed.', icon: Database });
        }

        try {
            const response = await fetch('/api/chat', { method: 'OPTIONS' });
            next.push({ name: 'Chat API Route', status: response.status < 500 ? 'active' : 'warning', detail: `API responded with HTTP ${response.status}.`, icon: Server });
        } catch {
            next.push({ name: 'Chat API Route', status: 'warning', detail: 'Unable to verify /api/chat via OPTIONS. This can be normal if OPTIONS is not implemented.', icon: Server });
        }

        try {
            const response = await fetch('/api/wa/status', { cache: 'no-store' });
            const data = await response.json().catch(() => ({}));
            next.push({ name: 'WhatsApp Service', status: response.ok && data.connected ? 'active' : 'warning', detail: response.ok ? (data.message || (data.connected ? 'Connected.' : 'Service available but disconnected.')) : 'Status endpoint is not ready.', icon: data.connected ? CheckCircle2 : WifiOff });
        } catch {
            next.push({ name: 'WhatsApp Service', status: 'warning', detail: 'No /api/wa/status endpoint found yet. Add this after connecting Baileys service.', icon: WifiOff });
        }

        setChecks(next);
        setIsLoading(false);
    };

    useEffect(() => { runChecks(); }, []);

    const badgeClass = (status: CheckItem['status']) => status === 'active' ? 'bg-emerald-50 text-emerald-700' : status === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">System Status</h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">Monitor database, AI API, and WhatsApp integration availability.</p>
                </div>
                <button onClick={runChecks} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"><RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> Run Checks</button>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                {checks.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.name} className="rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                            <div className="mb-5 flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Icon size={20} /></div><span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${badgeClass(item.status)}`}>{item.status}</span></div>
                            <h3 className="text-lg font-semibold text-slate-950">{item.name}</h3>
                            <p className="mt-2 text-sm font-medium leading-7 text-slate-500">{item.detail}</p>
                        </div>
                    );
                })}
            </div>

            <section className="rounded-[1.4rem] border border-slate-200 bg-white p-7 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                <div className="mb-4 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Activity size={20} /></div><div><h3 className="font-semibold text-slate-950">Operational Checklist</h3><p className="text-[13px] font-medium text-slate-500">Use this checklist before presentation or deployment.</p></div></div>
                <div className="grid gap-3 md:grid-cols-2">
                    {['Supabase environment variables are configured.', 'RLS policies are ready for public ticket insert and admin reads.', 'Knowledge documents have been embedded.', 'Chat API returns citations from knowledge base.', 'WhatsApp service is deployed separately from Vercel.', 'Admin can respond to tickets via WhatsApp link.'].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600"><CheckCircle2 size={17} className="text-emerald-600" /> {item}</div>)}
                </div>
            </section>
        </div>
    );
}
