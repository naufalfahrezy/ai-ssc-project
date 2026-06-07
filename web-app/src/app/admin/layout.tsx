'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isAuth, setIsAuth] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) router.push('/login');
            else setIsAuth(true);
        };
        checkAuth();
    }, [router]);

    if (!isAuth) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="animate-spin text-slate-300" size={24} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-[Figtree,ui-sans-serif,system-ui,sans-serif] text-slate-900 antialiased selection:bg-red-100 selection:text-red-900">
            <style jsx global>{`
        @import url('https://fonts.bunny.net/css?family=figtree:400,500,600,700&display=swap');
        html { font-family: 'Figtree', ui-sans-serif, system-ui, sans-serif; }
        body { background: #F8FAFC; }
      `}</style>
            <Sidebar />
            <div className="ml-64 flex min-h-screen min-w-0 flex-col">
                <Header />
                <main className="flex-1 overflow-auto p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
