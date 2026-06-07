'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MessageSquareText, RefreshCw, Search, Smartphone, Star } from 'lucide-react';

type ChatMessage = { role: 'user' | 'bot'; content: string };
type ChatSession = { id: string; source: string; user_identifier: string; user_name: string | null; chat_history: ChatMessage[] | null; rating: number | null; created_at: string; updated_at: string };

export default function ChatHistoryPage() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [selected, setSelected] = useState<ChatSession | null>(null);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchSessions = async () => {
        setIsLoading(true);
        const { data } = await supabase.from('chat_sessions').select('*').order('updated_at', { ascending: false });
        setSessions((data || []) as ChatSession[]);
        setSelected((data?.[0] as ChatSession) || null);
        setIsLoading(false);
    };

    useEffect(() => { fetchSessions(); }, []);

    const filtered = useMemo(() => {
        const q = query.toLowerCase();
        return sessions.filter((item) => `${item.user_name || ''} ${item.user_identifier} ${item.source}`.toLowerCase().includes(q));
    }, [sessions, query]);

    const formatDate = (date: string) => new Date(date).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Chat History</h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">Review user conversations from Web and WhatsApp channels.</p>
                </div>
                <button onClick={fetchSessions} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"><RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> Refresh</button>
            </div>

            <div className="grid min-h-[680px] gap-6 xl:grid-cols-[420px_1fr]">
                <section className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                    <div className="border-b border-slate-100 p-4">
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                            <Search size={16} className="text-slate-400" />
                            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations..." className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" />
                        </div>
                    </div>
                    <div className="max-h-[620px] overflow-y-auto divide-y divide-slate-100">
                        {filtered.length === 0 ? <div className="p-8 text-center text-sm font-medium text-slate-400">No chat session found.</div> : filtered.map((session) => (
                            <button key={session.id} onClick={() => setSelected(session)} className={`flex w-full items-center gap-3 px-5 py-4 text-left transition ${selected?.id === session.id ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-600 ring-1 ring-slate-200">
                                    {session.source === 'whatsapp' ? <Smartphone size={18} /> : <MessageSquareText size={18} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-900">{session.user_name || session.user_identifier}</p>
                                    <p className="mt-1 truncate text-[12px] font-medium capitalize text-slate-400">{session.source} · {formatDate(session.updated_at || session.created_at)}</p>
                                </div>
                                {session.rating ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-600"><Star size={12} className="fill-amber-400" />{session.rating}</span> : null}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="flex flex-col overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                    {!selected ? (
                        <div className="flex flex-1 items-center justify-center text-sm font-medium text-slate-400">Select a chat session.</div>
                    ) : (
                        <>
                            <div className="border-b border-slate-100 px-6 py-5">
                                <h3 className="text-base font-semibold text-slate-950">{selected.user_name || selected.user_identifier}</h3>
                                <p className="mt-1 text-[13px] font-medium capitalize text-slate-500">{selected.source} source · {formatDate(selected.created_at)}</p>
                            </div>
                            <div className="flex-1 space-y-4 overflow-y-auto bg-[#F7F8FA] p-6">
                                {(selected.chat_history || []).length === 0 ? <div className="text-center text-sm font-medium text-slate-400">This session has no transcript.</div> : selected.chat_history?.map((msg, idx) => {
                                    const isUser = msg.role === 'user';
                                    return (
                                        <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm font-medium leading-7 shadow-sm ${isUser ? 'rounded-br-md bg-slate-900 text-white' : 'rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200'}`}>{msg.content}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
