'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CalendarDays, CircleUserRound } from 'lucide-react';

export default function Header() {
    const [email, setEmail] = useState('Admin SSC');
    const [time, setTime] = useState('');

    useEffect(() => {
        const loadUser = async () => {
            const { data } = await supabase.auth.getUser();
            if (data.user?.email) setEmail(data.user.email);
        };

        const updateClock = () => {
            setTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        };

        loadUser();
        updateClock();
        const interval = setInterval(updateClock, 1000 * 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-8 backdrop-blur-xl">
            <div>
                <h2 className="text-[18px] font-semibold tracking-tight text-slate-950">Sisca Admin Dashboard</h2>
                <p className="mt-1 text-[12px] font-medium text-slate-400">Manage knowledge, conversations, tickets, and WhatsApp service.</p>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700">
                    <CalendarDays size={16} className="text-slate-400" /> {time || '--:--'}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700" title={email}>
                    <CircleUserRound size={19} />
                </div>
            </div>
        </header>
    );
}
