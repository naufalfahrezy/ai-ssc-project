'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    AlertCircle,
    Bot,
    CheckCircle2,
    Clock,
    Loader2,
    RotateCcw,
    Save,
    ShieldCheck,
    SlidersHorizontal,
} from 'lucide-react';

type BotSettings = {
    id: string;
    system_prompt: string;
    web_welcome: string;
    wa_welcome: string;
    office_hours: string;
    out_of_scope_message: string;
    temperature: number;
    max_output_tokens: number;
    match_threshold: number;
    match_count: number;
    updated_at?: string;
};

const defaultSettings: BotSettings = {
    id: 'default',
    system_prompt:
        'Kamu adalah Sisca, Student Information & Service Center Assistant untuk Telkom University Surabaya. Jawab dengan ramah, jelas, profesional, dan hanya berdasarkan konteks knowledge base yang diberikan.',
    web_welcome:
        'Halo Kak! Aku Sisca, asisten akademik virtual Telkom University Surabaya. Ada yang bisa Sisca bantu hari ini?',
    wa_welcome:
        'Halo Kak, Sisca siap membantu informasi akademik TUS melalui WhatsApp.',
    office_hours: 'Monday - Friday, 08.00 - 16.00 WIB',
    out_of_scope_message:
        'Maaf Kak, informasi tersebut belum tersedia di knowledge base Sisca. Silakan buat tiket laporan agar staf SSC dapat menindaklanjuti.',
    temperature: 0.2,
    max_output_tokens: 900,
    match_threshold: 0.45,
    match_count: 5,
};

export default function BotSettingsPage() {
    const [settings, setSettings] = useState<BotSettings>(defaultSettings);
    const [isFetching, setIsFetching] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [notice, setNotice] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    const fetchSettings = async () => {
        setIsFetching(true);
        setNotice(null);

        const { data, error } = await supabase
            .from('bot_settings')
            .select('*')
            .eq('id', 'default')
            .single();

        if (error) {
            setNotice({
                type: 'error',
                message:
                    'Bot settings belum terbaca. Pastikan tabel bot_settings dan policy Supabase sudah dibuat.',
            });
            setSettings(defaultSettings);
        } else {
            setSettings({
                ...defaultSettings,
                ...data,
                temperature: Number(data.temperature ?? 0.2),
                max_output_tokens: Number(data.max_output_tokens ?? 900),
                match_threshold: Number(data.match_threshold ?? 0.45),
                match_count: Number(data.match_count ?? 5),
            });
        }

        setIsFetching(false);
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setNotice(null);

        const payload = {
            id: 'default',
            system_prompt: settings.system_prompt,
            web_welcome: settings.web_welcome,
            wa_welcome: settings.wa_welcome,
            office_hours: settings.office_hours,
            out_of_scope_message: settings.out_of_scope_message,
            temperature: Number(settings.temperature),
            max_output_tokens: Number(settings.max_output_tokens),
            match_threshold: Number(settings.match_threshold),
            match_count: Number(settings.match_count),
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from('bot_settings')
            .upsert(payload, { onConflict: 'id' });

        if (error) {
            setNotice({
                type: 'error',
                message: `Failed to save settings: ${error.message}`,
            });
        } else {
            setNotice({
                type: 'success',
                message:
                    'Bot settings saved. Chat API will use these settings on the next message.',
            });
        }

        setIsSaving(false);
    };

    const handleReset = () => {
        setSettings(defaultSettings);
        setNotice({
            type: 'success',
            message:
                'Settings reset locally. Click Save Settings to apply it to the chatbot.',
        });
    };

    const formatUpdatedAt = (date?: string) => {
        if (!date) return 'Not saved yet';

        return new Date(date).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                        Bot Settings
                    </h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                        Configure Sisca persona, guardrails, retrieval behavior, and response style.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={isFetching || isSaving}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RotateCcw size={15} />
                        Reset
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isFetching || isSaving}
                        className="inline-flex items-center gap-2 rounded-full bg-[#E3000F] px-4 py-2 text-[13px] font-semibold text-white shadow-sm shadow-red-500/20 transition hover:bg-[#C0000D] disabled:bg-slate-300"
                    >
                        {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>

            {notice && (
                <div
                    className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${notice.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-500/20'
                            : 'bg-red-50 text-red-700 ring-red-500/20'
                        }`}
                >
                    {notice.type === 'success' ? (
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                    ) : (
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    )}
                    <span>{notice.message}</span>
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                <section className="space-y-5 rounded-[1.4rem] border border-slate-200 bg-white p-7 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-[#E3000F]">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-950">
                                AI Persona & Messages
                            </h3>
                            <p className="text-[13px] font-medium text-slate-500">
                                These settings are stored in Supabase and loaded by the chat API.
                            </p>
                        </div>
                    </div>

                    {isFetching ? (
                        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                            <Loader2 size={17} className="animate-spin" />
                            Loading bot settings...
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    System Prompt
                                </label>
                                <textarea
                                    value={settings.system_prompt}
                                    onChange={(e) =>
                                        setSettings({ ...settings, system_prompt: e.target.value })
                                    }
                                    className="min-h-[190px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-7 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                                />
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                        Web Welcome Message
                                    </label>
                                    <textarea
                                        value={settings.web_welcome}
                                        onChange={(e) =>
                                            setSettings({ ...settings, web_welcome: e.target.value })
                                        }
                                        className="min-h-[110px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-7 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                        WhatsApp Welcome Message
                                    </label>
                                    <textarea
                                        value={settings.wa_welcome}
                                        onChange={(e) =>
                                            setSettings({ ...settings, wa_welcome: e.target.value })
                                        }
                                        className="min-h-[110px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-7 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    Out of Scope Message
                                </label>
                                <textarea
                                    value={settings.out_of_scope_message}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            out_of_scope_message: e.target.value,
                                        })
                                    }
                                    className="min-h-[100px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-7 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    Office Hours
                                </label>
                                <input
                                    value={settings.office_hours}
                                    onChange={(e) =>
                                        setSettings({ ...settings, office_hours: e.target.value })
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                                />
                            </div>
                        </>
                    )}
                </section>

                <aside className="space-y-5">
                    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                            <ShieldCheck size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-950">Guardrail Rule</h3>
                        <p className="mt-2 text-sm font-medium leading-7 text-slate-500">
                            Sisca should not answer outside the retrieved knowledge base context.
                            If no relevant context exists, it should suggest the ticket form.
                        </p>
                    </div>

                    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <Clock size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-950">Office Hour Trigger</h3>
                        <p className="mt-2 text-sm font-medium leading-7 text-slate-500">
                            Office hours are inserted into the chat prompt, so Sisca can tell
                            students when staff will follow up.
                        </p>
                    </div>

                    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                            <SlidersHorizontal size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-950">Retrieval Settings</h3>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                    Match Threshold
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={settings.match_threshold}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            match_threshold: Number(e.target.value),
                                        })
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                    Match Count
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    step="1"
                                    value={settings.match_count}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            match_count: Number(e.target.value),
                                        })
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                    Temperature
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={settings.temperature}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            temperature: Number(e.target.value),
                                        })
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                    Max Output Tokens
                                </label>
                                <input
                                    type="number"
                                    min="128"
                                    max="2048"
                                    step="64"
                                    value={settings.max_output_tokens}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            max_output_tokens: Number(e.target.value),
                                        })
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                                />
                            </div>
                        </div>

                        <p className="mt-5 text-[12px] font-medium leading-6 text-slate-400">
                            Last updated: {formatUpdatedAt(settings.updated_at)}
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}