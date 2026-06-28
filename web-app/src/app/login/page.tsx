'use client';

import { useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import SiscaLogo from '@/components/SiscaLogo';
import {
    AlertCircle,
    ArrowLeft,
    Bot,
    CheckCircle2,
    Database,
    Eye,
    EyeOff,
    FileText,
    Loader2,
    Lock,
    Mail,
    MessageSquare,
    ShieldCheck,
} from 'lucide-react';

const LOGIN_ERROR_MESSAGE =
    'Email atau kata sandi tidak sesuai. Silakan periksa kembali akun admin Sisca.';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();

    useEffect(() => {
        const currentUrl = new URL(window.location.href);
        const hasSensitiveQuery =
            currentUrl.searchParams.has('email') ||
            currentUrl.searchParams.has('password');

        if (hasSensitiveQuery) {
            window.history.replaceState(null, '', '/login');
        }
    }, []);

    const handleLogin = async (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (isLoading) return;

        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();

        if (!cleanEmail || !cleanPassword) {
            setError('Email dan kata sandi wajib diisi.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: cleanPassword,
            });

            if (loginError) {
                setError(LOGIN_ERROR_MESSAGE);
                setIsLoading(false);
                return;
            }

            router.replace('/admin');
            router.refresh();
        } catch (err) {
            console.error('Login error:', err);
            setError('Terjadi kesalahan saat login. Silakan coba kembali.');
            setIsLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#FBFCFD] font-[Figtree,ui-sans-serif,system-ui,sans-serif] text-slate-900 selection:bg-red-100 selection:text-red-900">
            <style jsx global>{`
                @import url('https://fonts.bunny.net/css?family=figtree:400,500,600,700&display=swap');

                html {
                    font-family: 'Figtree', ui-sans-serif, system-ui, sans-serif;
                }

                body {
                    background: #FBFCFD;
                }
            `}</style>

            <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(227,0,15,0.08),transparent_44%),linear-gradient(180deg,#FFFFFF_0%,#FBFCFD_78%)]" />
            <div className="pointer-events-none absolute -left-28 top-24 h-80 w-80 rounded-full bg-red-50 blur-3xl" />
            <div className="pointer-events-none absolute -right-28 bottom-10 h-96 w-96 rounded-full bg-slate-100 blur-3xl" />

            <header className="relative z-10 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-6">
                    <Link href="/" className="flex items-center gap-2">
                        <SiscaLogo className="h-8 w-8" />
                        <span className="text-xl font-semibold tracking-tight text-slate-900">
                            Sisca<span className="text-[#E3000F]">.</span>
                        </span>
                    </Link>

                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    >
                        <ArrowLeft size={15} />
                        Kembali
                    </Link>
                </div>
            </header>

            <section className="relative z-10 mx-auto grid min-h-[calc(100svh-64px)] max-w-6xl items-center gap-12 px-5 py-10 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
                <div className="hidden lg:block">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#E3000F]" />
                        Admin Workspace
                    </div>

                    <h1 className="max-w-xl text-[4rem] font-semibold leading-[1.02] tracking-[-0.055em] text-slate-950">
                        Kelola layanan akademik dari satu tempat.
                    </h1>

                    <p className="mt-6 max-w-lg text-[16px] font-medium leading-8 text-slate-500">
                        Masuk ke dashboard Sisca untuk mengelola knowledge base,
                        memantau chat mahasiswa, dan menindaklanjuti tiket laporan SSC.
                    </p>

                    <div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
                        {[
                            {
                                icon: Database,
                                title: 'Knowledge Base',
                                desc: 'Unggah dan kelola dokumen referensi AI.',
                            },
                            {
                                icon: MessageSquare,
                                title: 'Chat History',
                                desc: 'Pantau riwayat percakapan web dan WhatsApp.',
                            },
                            {
                                icon: FileText,
                                title: 'Ticketing',
                                desc: 'Tindak lanjuti laporan kendala mahasiswa.',
                            },
                            {
                                icon: Bot,
                                title: 'AI Assistant',
                                desc: 'Atur persona dan respons Sisca.',
                            },
                        ].map((item) => {
                            const Icon = item.icon;

                            return (
                                <div
                                    key={item.title}
                                    className="rounded-[1.35rem] border border-slate-200/70 bg-white/80 p-5 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.45)] backdrop-blur-xl"
                                >
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-100">
                                        <Icon size={19} strokeWidth={1.7} />
                                    </div>

                                    <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
                                        {item.title}
                                    </h3>

                                    <p className="mt-2 text-[13px] font-medium leading-6 text-slate-500">
                                        {item.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mx-auto w-full max-w-[450px]">
                    <div className="mb-8 text-center lg:hidden">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                            <SiscaLogo className="h-8 w-8" />
                        </div>

                        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
                            Sisca Workspace
                        </h1>

                        <p className="mt-2 text-[14px] font-medium leading-6 text-slate-500">
                            Akses admin Student Service Center Assistant.
                        </p>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.55)] sm:p-8">
                        <div className="mb-8 hidden items-center gap-3 lg:flex">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                                <SiscaLogo className="h-7 w-7" />
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                                    Masuk ke Sisca
                                </h2>

                                <p className="mt-1 text-[13px] font-medium text-slate-500">
                                    Akses terbatas untuk staf/admin SSC.
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-red-700">
                                <AlertCircle className="mt-0.5 shrink-0" size={18} />
                                <p className="text-[13px] font-medium leading-6">
                                    {error}
                                </p>
                            </div>
                        )}

                        <form
                            noValidate
                            onSubmit={handleLogin}
                            className="space-y-5"
                        >
                            <div>
                                <label
                                    htmlFor="email"
                                    className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
                                >
                                    Email Admin
                                </label>

                                <div className="relative">
                                    <Mail
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                        size={17}
                                    />

                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        inputMode="email"
                                        autoComplete="email"
                                        required
                                        disabled={isLoading}
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (error) setError('');
                                        }}
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-[14px] font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                                        placeholder="admin@tus.edu"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="mb-2 flex items-center justify-between gap-4">
                                    <label
                                        htmlFor="password"
                                        className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
                                    >
                                        Kata Sandi
                                    </label>

                                    <Link
                                        href="/forgot-password"
                                        className="text-[12px] font-semibold text-slate-500 transition-colors hover:text-slate-900"
                                    >
                                        Lupa kata sandi?
                                    </Link>
                                </div>

                                <div className="relative">
                                    <Lock
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                        size={17}
                                    />

                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        disabled={isLoading}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (error) setError('');
                                        }}
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-12 text-[14px] font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                                        placeholder="Masukkan kata sandi"
                                    />

                                    <button
                                        type="button"
                                        disabled={isLoading}
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        aria-label={
                                            showPassword
                                                ? 'Sembunyikan kata sandi'
                                                : 'Tampilkan kata sandi'
                                        }
                                    >
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[14px] font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.9)] transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Memverifikasi...
                                    </>
                                ) : (
                                    'Masuk ke Dashboard'
                                )}
                            </button>
                        </form>

                        <div className="my-7 flex items-center gap-3">
                            <div className="h-px flex-1 bg-slate-100" />
                            <span className="text-[11px] font-medium text-slate-400">
                                Sisca Platform
                            </span>
                            <div className="h-px flex-1 bg-slate-100" />
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                            <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#E3000F] ring-1 ring-slate-100">
                                    <ShieldCheck size={18} />
                                </div>

                                <div>
                                    <p className="text-[13px] font-semibold text-slate-800">
                                        Akses internal SSC
                                    </p>

                                    <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
                                        Gunakan akun admin resmi untuk mengelola dokumen,
                                        riwayat chat, dan laporan mahasiswa.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 flex items-center justify-center gap-2 text-[12px] font-medium text-slate-400">
                        <CheckCircle2 size={14} />
                        Terhubung dengan Supabase Authentication
                    </div>
                </div>
            </section>
        </main>
    );
}