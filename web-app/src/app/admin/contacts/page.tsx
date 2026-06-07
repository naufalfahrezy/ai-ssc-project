'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Bot, MessageCircle, RefreshCw, Search, ToggleLeft, ToggleRight, Users } from 'lucide-react';

type Contact = { wa_number: string; name: string | null; is_bot_active: boolean | null; last_interaction: string | null };

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchContacts = async () => {
        setIsLoading(true);
        const { data } = await supabase.from('wa_contacts').select('*').order('last_interaction', { ascending: false });
        setContacts(data || []);
        setIsLoading(false);
    };

    useEffect(() => { fetchContacts(); }, []);

    const filtered = useMemo(() => {
        const q = query.toLowerCase();
        return contacts.filter((c) => `${c.name || ''} ${c.wa_number}`.toLowerCase().includes(q));
    }, [contacts, query]);

    const toggleBot = async (contact: Contact) => {
        await supabase.from('wa_contacts').update({ is_bot_active: !contact.is_bot_active, last_interaction: new Date().toISOString() }).eq('wa_number', contact.wa_number);
        fetchContacts();
    };

    const openWhatsApp = (wa: string) => {
        const normalized = wa.replace(/[^0-9]/g, '').replace(/^0/, '62');
        window.open(`https://wa.me/${normalized}`, '_blank');
    };

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Contacts</h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">Manage student contacts and control manual takeover per WhatsApp number.</p>
                </div>
                <button onClick={fetchContacts} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"><RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> Refresh</button>
            </div>

            <section className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Users size={20} /></div><div><h3 className="font-semibold text-slate-950">Saved Contacts</h3><p className="text-[13px] font-medium text-slate-500">{contacts.length} total contacts</p></div></div>
                    <div className="flex w-80 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"><Search size={16} className="text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contact..." className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" /></div>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400"><tr><th className="px-6 py-3">Contact</th><th className="px-6 py-3">Bot Status</th><th className="px-6 py-3">Last Interaction</th><th className="px-6 py-3 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? <tr><td colSpan={4} className="p-8 text-center font-medium text-slate-400">No contacts found.</td></tr> : filtered.map((contact) => (
                            <tr key={contact.wa_number} className="hover:bg-slate-50/70">
                                <td className="px-6 py-4"><p className="font-semibold text-slate-900">{contact.name || 'Unnamed User'}</p><p className="mt-1 text-[13px] font-medium text-slate-500">{contact.wa_number}</p></td>
                                <td className="px-6 py-4"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${contact.is_bot_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}><Bot size={12} /> {contact.is_bot_active ? 'AI Active' : 'Manual Mode'}</span></td>
                                <td className="px-6 py-4 text-[13px] font-medium text-slate-500">{contact.last_interaction ? new Date(contact.last_interaction).toLocaleString('id-ID') : '-'}</td>
                                <td className="px-6 py-4 text-right"><button onClick={() => toggleBot(contact)} className="mr-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">{contact.is_bot_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />} Toggle Bot</button><button onClick={() => openWhatsApp(contact.wa_number)} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white hover:bg-slate-700"><MessageCircle size={14} /> WhatsApp</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
