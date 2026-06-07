'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MessageCircle, RefreshCw, Search, TicketCheck } from 'lucide-react';

type Ticket = { id: string; pelapor_name: string; pelapor_wa: string; issue_description: string; status: string; created_at: string };

const statusOptions = ['pending', 'in_progress', 'resolved', 'closed'];

export default function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(true);

    const fetchTickets = async () => {
        setIsLoading(true);
        const { data } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
        setTickets(data || []);
        setIsLoading(false);
    };

    useEffect(() => { fetchTickets(); }, []);

    const filtered = useMemo(() => {
        const q = query.toLowerCase();
        return tickets.filter((ticket) => {
            const matchQuery = `${ticket.pelapor_name} ${ticket.pelapor_wa} ${ticket.issue_description}`.toLowerCase().includes(q);
            const matchStatus = filter === 'all' || ticket.status === filter;
            return matchQuery && matchStatus;
        });
    }, [tickets, query, filter]);

    const updateStatus = async (ticket: Ticket, status: string) => {
        await supabase.from('tickets').update({ status }).eq('id', ticket.id);
        fetchTickets();
    };

    const openWhatsApp = (ticket: Ticket) => {
        const number = ticket.pelapor_wa.replace(/[^0-9]/g, '').replace(/^0/, '62');
        const message = encodeURIComponent(`Halo Kak ${ticket.pelapor_name}, kami dari SSC Telkom University Surabaya ingin menindaklanjuti tiket laporan Kakak:\n\n${ticket.issue_description}\n\nBisa dibantu jelaskan detail tambahannya?`);
        window.open(`https://wa.me/${number}?text=${message}`, '_blank');
    };

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Tickets</h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">Handle student reports that cannot be answered automatically by Sisca.</p>
                </div>
                <button onClick={fetchTickets} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"><RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> Refresh</button>
            </div>

            <section className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-[#E3000F]"><TicketCheck size={20} /></div><div><h3 className="font-semibold text-slate-950">Report Queue</h3><p className="text-[13px] font-medium text-slate-500">{filtered.length} displayed tickets</p></div></div>
                    <div className="flex gap-3"><select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-600 outline-none"><option value="all">All Status</option>{statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}</select><div className="flex w-80 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"><Search size={16} className="text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ticket..." className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" /></div></div>
                </div>
                <div className="divide-y divide-slate-100">
                    {filtered.length === 0 ? <div className="p-8 text-center text-sm font-medium text-slate-400">No tickets found.</div> : filtered.map((ticket) => (
                        <div key={ticket.id} className="grid gap-4 px-6 py-5 hover:bg-slate-50/70 lg:grid-cols-[1fr_180px_230px] lg:items-center">
                            <div className="min-w-0"><div className="flex items-center gap-2"><p className="font-semibold text-slate-950">{ticket.pelapor_name}</p><span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${ticket.status === 'pending' ? 'bg-red-50 text-red-600' : ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{ticket.status}</span></div><p className="mt-1 text-[13px] font-medium text-slate-500">{ticket.pelapor_wa} · {new Date(ticket.created_at).toLocaleString('id-ID')}</p><p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700">{ticket.issue_description}</p></div>
                            <select value={ticket.status} onChange={(e) => updateStatus(ticket, e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 outline-none">{statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                            <button onClick={() => openWhatsApp(ticket)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[13px] font-semibold text-white hover:bg-slate-700"><MessageCircle size={16} /> Respond via WhatsApp</button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
