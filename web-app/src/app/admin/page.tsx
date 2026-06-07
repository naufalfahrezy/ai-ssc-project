'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { BookOpen, Clock, MessageSquareText, RefreshCw, TicketCheck, Users, ArrowUpRight, Smartphone } from 'lucide-react';

type TicketData = { id: string; pelapor_name: string; pelapor_wa: string; issue_description: string; status: string; created_at: string };
type ChatData = { id: string; source: string; user_identifier: string; user_name: string | null; created_at: string; rating: number | null };

export default function OverviewPage() {
    const [stats, setStats] = useState({ documents: 0, chats: 0, pendingTickets: 0, contacts: 0 });
    const [recentTickets, setRecentTickets] = useState<TicketData[]>([]);
    const [recentChats, setRecentChats] = useState<ChatData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        const [{ count: documents }, { count: chats }, { count: pendingTickets }, { count: contacts }] = await Promise.all([
            supabase.from('knowledge_base').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('chat_sessions').select('*', { count: 'exact', head: true }),
            supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('wa_contacts').select('*', { count: 'exact', head: true }),
        ]);

        setStats({ documents: documents || 0, chats: chats || 0, pendingTickets: pendingTickets || 0, contacts: contacts || 0 });

        const { data: tickets } = await supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(5);
        const { data: chatsData } = await supabase.from('chat_sessions').select('*').order('created_at', { ascending: false }).limit(5);
        setRecentTickets(tickets || []);
        setRecentChats(chatsData || []);
        setIsLoading(false);
    };

    useEffect(() => { fetchDashboardData(); }, []);

    const formatDate = (date: string) => new Date(date).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    const cards = [
        { title: 'Active Documents', value: stats.documents, icon: BookOpen, desc: 'Knowledge files available', bg: 'bg-blue-50', color: 'text-blue-600' },
        { title: 'Chat Sessions', value: stats.chats, icon: MessageSquareText, desc: 'Web and WhatsApp logs', bg: 'bg-emerald-50', color: 'text-emerald-600' },
        { title: 'Pending Tickets', value: stats.pendingTickets, icon: TicketCheck, desc: 'Need staff follow-up', bg: 'bg-red-50', color: 'text-[#E3000F]' },
        { title: 'Saved Contacts', value: stats.contacts, icon: Users, desc: 'Known student contacts', bg: 'bg-amber-50', color: 'text-amber-600' },
    ];

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Overview</h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">Welcome back. Here is the current Sisca service summary.</p>
                </div>
                <button onClick={fetchDashboardData} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50">
                    <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.title} className="rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                            <div className="mb-6 flex items-start justify-between">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{card.title}</p>
                                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.bg} ${card.color}`}><Icon size={20} /></div>
                            </div>
                            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{card.value}</h2>
                            <p className="mt-1 text-[13px] font-medium text-slate-500">{card.desc}</p>
                        </div>
                    );
                })}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                        <div>
                            <h3 className="text-base font-semibold text-slate-950">Recent Tickets</h3>
                            <p className="text-[13px] font-medium text-slate-500">Latest student reports from the ticket form.</p>
                        </div>
                        <Link href="/admin/tickets" className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-slate-950">View All <ArrowUpRight size={14} /></Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {recentTickets.length === 0 ? <div className="p-8 text-center text-sm font-medium text-slate-400">No ticket records yet.</div> : recentTickets.map((ticket) => (
                            <div key={ticket.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/70">
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-900">{ticket.pelapor_name}</p>
                                    <p className="mt-1 truncate text-[13px] font-medium text-slate-500">{ticket.issue_description}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${ticket.status === 'pending' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{ticket.status}</span>
                                    <p className="mt-2 text-[11px] font-medium text-slate-400">{formatDate(ticket.created_at)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                        <div>
                            <h3 className="text-base font-semibold text-slate-950">Recent Conversations</h3>
                            <p className="text-[13px] font-medium text-slate-500">Latest interactions handled by Sisca.</p>
                        </div>
                        <Link href="/admin/chat-history" className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-slate-950">View All <ArrowUpRight size={14} /></Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {recentChats.length === 0 ? <div className="p-8 text-center text-sm font-medium text-slate-400">No conversation records yet.</div> : recentChats.map((chat) => (
                            <div key={chat.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/70">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                                        {chat.source === 'whatsapp' ? <Smartphone size={18} /> : <MessageSquareText size={18} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-900">{chat.user_name || chat.user_identifier}</p>
                                        <p className="mt-1 text-[12px] font-medium capitalize text-slate-400">{chat.source} source</p>
                                    </div>
                                </div>
                                <p className="text-[11px] font-medium text-slate-400">{formatDate(chat.created_at)}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
