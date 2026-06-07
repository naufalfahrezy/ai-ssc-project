'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    AlertCircle,
    Bot,
    CheckCircle2,
    Copy,
    Loader2,
    LogOut,
    MessageSquareReply,
    Plus,
    Power,
    QrCode,
    RefreshCw,
    Send,
    Smartphone,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Wifi,
    WifiOff,
} from 'lucide-react';

type WaSettings = {
    botEnabled: boolean;
    quoteReply: boolean;
    responseMode: 'private' | 'group' | 'both';
};

type WaStatus = {
    connected: boolean;
    phone?: string | null;
    qr?: string | null;
    message?: string;
    settings?: WaSettings;
    keywords_count?: number;
};

type KeywordReply = {
    id: string;
    keyword: string;
    reply: string;
    matchType: 'contains' | 'exact';
    isActive: boolean;
    createdAt?: string;
};

const defaultSettings: WaSettings = {
    botEnabled: true,
    quoteReply: true,
    responseMode: 'private',
};

export default function WhatsAppIntegrationPage() {
    const [status, setStatus] = useState<WaStatus>({
        connected: false,
        message: 'Not checked yet',
        settings: defaultSettings,
    });

    const [settings, setSettings] = useState<WaSettings>(defaultSettings);
    const [keywords, setKeywords] = useState<KeywordReply[]>([]);
    const [contactCount, setContactCount] = useState(0);

    const [isChecking, setIsChecking] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [isAddingKeyword, setIsAddingKeyword] = useState(false);
    const [deletingKeywordId, setDeletingKeywordId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const [testMessage, setTestMessage] = useState({
        to: '',
        message: '',
    });

    const [keywordForm, setKeywordForm] = useState({
        keyword: '',
        reply: '',
        matchType: 'contains' as 'contains' | 'exact',
    });

    const [notice, setNotice] = useState<{
        type: 'success' | 'error' | 'info';
        message: string;
    } | null>(null);

    const checkStatus = async () => {
        setIsChecking(true);
        setNotice(null);

        try {
            const response = await fetch('/api/wa/status', { cache: 'no-store' });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || 'WhatsApp gateway is not available.');
            }

            setStatus({
                connected: !!data.connected,
                phone: data.phone,
                qr: data.qr,
                message: data.message,
                settings: data.settings,
                keywords_count: data.keywords_count,
            });

            if (data.settings) {
                setSettings({
                    botEnabled: !!data.settings.botEnabled,
                    quoteReply: !!data.settings.quoteReply,
                    responseMode: data.settings.responseMode || 'private',
                });
            }
        } catch (error) {
            setStatus({
                connected: false,
                message:
                    error instanceof Error
                        ? error.message
                        : 'Unable to reach WhatsApp service.',
                settings,
            });

            setNotice({
                type: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Unable to reach WhatsApp service.',
            });
        } finally {
            setIsChecking(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/wa/settings', { cache: 'no-store' });
            const data = await response.json();

            if (!response.ok) throw new Error(data?.message || 'Failed to load settings.');

            if (data.settings) {
                setSettings({
                    botEnabled: !!data.settings.botEnabled,
                    quoteReply: !!data.settings.quoteReply,
                    responseMode: data.settings.responseMode || 'private',
                });
            }
        } catch (error) {
            console.warn('Failed to fetch WA settings:', error);
        }
    };

    const fetchKeywords = async () => {
        try {
            const response = await fetch('/api/wa/keywords', { cache: 'no-store' });
            const data = await response.json();

            if (!response.ok) throw new Error(data?.message || 'Failed to load keywords.');

            setKeywords(Array.isArray(data.keywords) ? data.keywords : []);
        } catch (error) {
            console.warn('Failed to fetch keyword replies:', error);
        }
    };

    const fetchContactCount = async () => {
        const { count } = await supabase
            .from('wa_contacts')
            .select('*', { count: 'exact', head: true });

        setContactCount(count || 0);
    };

    useEffect(() => {
        checkStatus();
        fetchSettings();
        fetchKeywords();
        fetchContactCount();
    }, []);

    const updateSettings = async (nextSettings: Partial<WaSettings>) => {
        const mergedSettings = {
            ...settings,
            ...nextSettings,
        };

        setSettings(mergedSettings);
        setIsSavingSettings(true);
        setNotice(null);

        try {
            const response = await fetch('/api/wa/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mergedSettings),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || 'Failed to update WhatsApp settings.');
            }

            setSettings(data.settings || mergedSettings);
            setNotice({
                type: 'success',
                message: 'WhatsApp settings updated successfully.',
            });

            await checkStatus();
        } catch (error) {
            setNotice({
                type: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to update WhatsApp settings.',
            });
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleLogout = async () => {
        const confirmed = window.confirm(
            'Yakin ingin logout sesi WhatsApp? Setelah logout, admin perlu scan QR ulang.'
        );

        if (!confirmed) return;

        setIsLoggingOut(true);
        setNotice(null);

        try {
            const response = await fetch('/api/wa/logout', {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || 'Failed to logout WhatsApp session.');
            }

            setNotice({
                type: 'success',
                message: 'WhatsApp session logged out. Restart gateway jika QR belum muncul.',
            });

            await checkStatus();
        } catch (error) {
            setNotice({
                type: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to logout WhatsApp session.',
            });
        } finally {
            setIsLoggingOut(false);
        }
    };

    const handleSendTestMessage = async (e: FormEvent) => {
        e.preventDefault();

        if (!testMessage.to.trim() || !testMessage.message.trim()) return;

        setIsSendingTest(true);
        setNotice(null);

        try {
            const response = await fetch('/api/wa/send-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testMessage),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || 'Failed to send WhatsApp message.');
            }

            setNotice({
                type: 'success',
                message: 'Test message sent successfully.',
            });

            setTestMessage({
                to: '',
                message: '',
            });
        } catch (error) {
            setNotice({
                type: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to send WhatsApp message.',
            });
        } finally {
            setIsSendingTest(false);
        }
    };

    const handleAddKeyword = async (e: FormEvent) => {
        e.preventDefault();

        if (!keywordForm.keyword.trim() || !keywordForm.reply.trim()) return;

        setIsAddingKeyword(true);
        setNotice(null);

        try {
            const response = await fetch('/api/wa/keywords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(keywordForm),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || 'Failed to create keyword reply.');
            }

            setKeywordForm({
                keyword: '',
                reply: '',
                matchType: 'contains',
            });

            setNotice({
                type: 'success',
                message: 'Custom keyword auto reply created.',
            });

            await fetchKeywords();
            await checkStatus();
        } catch (error) {
            setNotice({
                type: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to create keyword reply.',
            });
        } finally {
            setIsAddingKeyword(false);
        }
    };

    const handleToggleKeyword = async (keyword: KeywordReply) => {
        try {
            const response = await fetch(`/api/wa/keywords/${keyword.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isActive: !keyword.isActive,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || 'Failed to update keyword.');
            }

            await fetchKeywords();
        } catch (error) {
            setNotice({
                type: 'error',
                message:
                    error instanceof Error ? error.message : 'Failed to update keyword.',
            });
        }
    };

    const handleDeleteKeyword = async (id: string) => {
        const confirmed = window.confirm('Hapus keyword auto reply ini?');
        if (!confirmed) return;

        setDeletingKeywordId(id);
        setNotice(null);

        try {
            const response = await fetch(`/api/wa/keywords/${id}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || 'Failed to delete keyword.');
            }

            setNotice({
                type: 'success',
                message: 'Keyword reply deleted.',
            });

            await fetchKeywords();
            await checkStatus();
        } catch (error) {
            setNotice({
                type: 'error',
                message:
                    error instanceof Error ? error.message : 'Failed to delete keyword.',
            });
        } finally {
            setDeletingKeywordId(null);
        }
    };

    const webhookUrl =
        typeof window !== 'undefined'
            ? `${window.location.origin}/api/chat`
            : '/api/chat';

    const copyWebhookUrl = async () => {
        await navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    };

    const SettingToggle = ({
        active,
        label,
        description,
        onClick,
        disabled,
    }: {
        active: boolean;
        label: string;
        description: string;
        onClick: () => void;
        disabled?: boolean;
    }) => (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50 disabled:opacity-60"
        >
            <div>
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
                    {description}
                </p>
            </div>

            {active ? (
                <ToggleRight size={34} className="shrink-0 text-emerald-500" />
            ) : (
                <ToggleLeft size={34} className="shrink-0 text-slate-300" />
            )}
        </button>
    );

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                        WhatsApp Integration
                    </h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                        Manage Baileys WhatsApp session, QR pairing, chatbot behavior, keyword auto replies, and manual outbound messages.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={checkStatus}
                        disabled={isChecking}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                    >
                        <RefreshCw size={15} className={isChecking ? 'animate-spin' : ''} />
                        Check Status
                    </button>

                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="inline-flex items-center gap-2 rounded-full bg-[#E3000F] px-4 py-2 text-[13px] font-semibold text-white shadow-sm shadow-red-500/20 transition hover:bg-[#C0000D] disabled:bg-slate-300"
                    >
                        {isLoggingOut ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
                        Logout Session
                    </button>
                </div>
            </div>

            {notice && (
                <div
                    className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${notice.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-500/20'
                            : notice.type === 'error'
                                ? 'bg-red-50 text-red-700 ring-red-500/20'
                                : 'bg-blue-50 text-blue-700 ring-blue-500/20'
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

            <div className="grid gap-5 lg:grid-cols-4">
                <div className="rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                    <div className="mb-5 flex items-start justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Connection Status
                        </p>
                        <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${status.connected
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-red-50 text-[#E3000F]'
                                }`}
                        >
                            {status.connected ? <Wifi size={20} /> : <WifiOff size={20} />}
                        </div>
                    </div>

                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                        {status.connected ? 'Connected' : 'Disconnected'}
                    </h2>

                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                        {status.connected
                            ? status.phone || 'WhatsApp session is active.'
                            : status.message || 'WhatsApp is not connected.'}
                    </p>
                </div>

                <div className="rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                    <div className="mb-5 flex items-start justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Chatbot
                        </p>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <Bot size={20} />
                        </div>
                    </div>

                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                        {settings.botEnabled ? 'Enabled' : 'Disabled'}
                    </h2>

                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                        {settings.botEnabled
                            ? 'Sisca will auto reply to allowed WhatsApp chats.'
                            : 'Incoming messages are logged but not answered by bot.'}
                    </p>
                </div>

                <div className="rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                    <div className="mb-5 flex items-start justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Saved Contacts
                        </p>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                            <Smartphone size={20} />
                        </div>
                    </div>

                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                        {contactCount}
                    </h2>

                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                        Contacts collected from Web and WhatsApp sessions.
                    </p>
                </div>

                <div className="rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                    <div className="mb-5 flex items-start justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Keywords
                        </p>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                            <MessageSquareReply size={20} />
                        </div>
                    </div>

                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                        {keywords.length || status.keywords_count || 0}
                    </h2>

                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                        Active and inactive custom keyword auto replies.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                <section className="space-y-6 rounded-[1.4rem] border border-slate-200 bg-white p-7 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                            <QrCode size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-950">QR Pairing</h3>
                            <p className="text-[13px] font-medium text-slate-500">
                                Scan QR from WhatsApp Linked Devices when disconnected.
                            </p>
                        </div>
                    </div>

                    <div className="flex aspect-square items-center justify-center rounded-[1.3rem] border border-dashed border-slate-300 bg-slate-50 text-center">
                        {isChecking ? (
                            <Loader2 className="animate-spin text-slate-300" />
                        ) : status.connected ? (
                            <div className="px-8">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                    <CheckCircle2 size={32} />
                                </div>
                                <p className="text-base font-semibold text-slate-900">
                                    WhatsApp Connected
                                </p>
                                <p className="mt-2 text-[13px] font-medium leading-6 text-slate-500">
                                    Session is active
                                    {status.phone ? ` on ${status.phone}` : ''}. QR pairing is not required.
                                </p>
                            </div>
                        ) : status.qr ? (
                            <img
                                src={status.qr}
                                alt="WhatsApp QR Code"
                                className="h-full w-full rounded-[1.3rem] object-contain p-4"
                            />
                        ) : (
                            <div className="px-8">
                                <QrCode className="mx-auto mb-3 text-slate-300" size={44} />
                                <p className="text-sm font-semibold text-slate-600">
                                    QR code is not available
                                </p>
                                <p className="mt-1 text-[13px] font-medium leading-6 text-slate-400">
                                    Start or restart the WA Gateway, then click Check Status.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Chat API URL
                        </p>
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                            <code className="truncate text-[13px] text-slate-700">
                                {webhookUrl}
                            </code>
                            <button
                                type="button"
                                onClick={copyWebhookUrl}
                                className="text-slate-400 transition hover:text-slate-900"
                            >
                                {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                            </button>
                        </div>
                    </div>
                </section>

                <section className="space-y-6 rounded-[1.4rem] border border-slate-200 bg-white p-7 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                    <div>
                        <h3 className="font-semibold text-slate-950">WhatsApp Bot Controls</h3>
                        <p className="mt-1 text-[13px] font-medium text-slate-500">
                            Configure how Sisca responds to incoming WhatsApp messages.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <SettingToggle
                            active={settings.botEnabled}
                            label="WhatsApp Chatbot"
                            description="Turn auto reply on or off for WhatsApp messages."
                            disabled={isSavingSettings}
                            onClick={() => updateSettings({ botEnabled: !settings.botEnabled })}
                        />

                        <SettingToggle
                            active={settings.quoteReply}
                            label="Quoted Reply"
                            description="Reply with quoted user message for natural WhatsApp context."
                            disabled={isSavingSettings}
                            onClick={() => updateSettings({ quoteReply: !settings.quoteReply })}
                        />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="mb-3 text-sm font-semibold text-slate-900">
                            Response Scope
                        </p>

                        <div className="grid gap-2 md:grid-cols-3">
                            {[
                                { value: 'private', label: 'Private Only' },
                                { value: 'group', label: 'Group Only' },
                                { value: 'both', label: 'Private & Group' },
                            ].map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    disabled={isSavingSettings}
                                    onClick={() =>
                                        updateSettings({
                                            responseMode: item.value as WaSettings['responseMode'],
                                        })
                                    }
                                    className={`rounded-xl px-4 py-3 text-[13px] font-semibold transition ${settings.responseMode === item.value
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        } disabled:opacity-60`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        <p className="mt-3 text-[12px] font-medium leading-5 text-slate-400">
                            Current mode: {settings.responseMode}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-start gap-3">
                            <Power size={18} className="mt-0.5 text-[#E3000F]" />
                            <div>
                                <p className="text-sm font-semibold text-slate-900">
                                    Session Logout
                                </p>
                                <p className="mt-1 text-[13px] font-medium leading-6 text-slate-500">
                                    Logout will disconnect the current WhatsApp session. Admin must scan QR again to reconnect.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <section className="rounded-[1.4rem] border border-slate-200 bg-white p-7 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                            <Send size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-950">
                                Send WhatsApp Message
                            </h3>
                            <p className="text-[13px] font-medium text-slate-500">
                                Send manual outbound message from the admin dashboard.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSendTestMessage} className="space-y-4">
                        <div>
                            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                WhatsApp Number
                            </label>
                            <input
                                type="text"
                                value={testMessage.to}
                                onChange={(e) =>
                                    setTestMessage({ ...testMessage, to: e.target.value })
                                }
                                placeholder="Example: 081234567890"
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Message
                            </label>
                            <textarea
                                value={testMessage.message}
                                onChange={(e) =>
                                    setTestMessage({ ...testMessage, message: e.target.value })
                                }
                                placeholder="Write message to send..."
                                className="min-h-[130px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-7 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSendingTest || !status.connected}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E3000F] px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-[#C0000D] disabled:bg-slate-200 disabled:text-slate-400"
                        >
                            {isSendingTest ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Send size={16} />
                            )}
                            {status.connected ? 'Send Message' : 'Connect WhatsApp First'}
                        </button>
                    </form>
                </section>

                <section className="rounded-[1.4rem] border border-slate-200 bg-white p-7 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                            <MessageSquareReply size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-950">
                                Custom Keyword Auto Reply
                            </h3>
                            <p className="text-[13px] font-medium text-slate-500">
                                Reply instantly when incoming WhatsApp message matches a keyword.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleAddKeyword} className="mb-6 grid gap-3 md:grid-cols-[1fr_150px]">
                        <div className="md:col-span-1">
                            <input
                                type="text"
                                value={keywordForm.keyword}
                                onChange={(e) =>
                                    setKeywordForm({ ...keywordForm, keyword: e.target.value })
                                }
                                placeholder="Keyword, e.g. jam layanan"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                            />
                        </div>

                        <select
                            value={keywordForm.matchType}
                            onChange={(e) =>
                                setKeywordForm({
                                    ...keywordForm,
                                    matchType: e.target.value as 'contains' | 'exact',
                                })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                        >
                            <option value="contains">Contains</option>
                            <option value="exact">Exact</option>
                        </select>

                        <textarea
                            value={keywordForm.reply}
                            onChange={(e) =>
                                setKeywordForm({ ...keywordForm, reply: e.target.value })
                            }
                            placeholder="Auto reply message..."
                            className="min-h-[92px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white md:col-span-2"
                        />

                        <button
                            type="submit"
                            disabled={isAddingKeyword}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 md:col-span-2"
                        >
                            {isAddingKeyword ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Plus size={16} />
                            )}
                            Add Keyword Reply
                        </button>
                    </form>

                    <div className="space-y-3">
                        {keywords.length === 0 ? (
                            <div className="rounded-2xl bg-slate-50 p-5 text-center">
                                <p className="text-sm font-semibold text-slate-600">
                                    No keyword replies yet.
                                </p>
                                <p className="mt-1 text-[13px] font-medium text-slate-400">
                                    Add a keyword to create instant WhatsApp auto reply.
                                </p>
                            </div>
                        ) : (
                            keywords.map((keyword) => (
                                <div
                                    key={keyword.id}
                                    className="rounded-2xl border border-slate-200 bg-white p-4"
                                >
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {keyword.keyword}
                                                </p>
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                    {keyword.matchType}
                                                </span>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${keyword.isActive
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : 'bg-slate-100 text-slate-500'
                                                        }`}
                                                >
                                                    {keyword.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <p className="mt-2 whitespace-pre-wrap text-[13px] font-medium leading-6 text-slate-500">
                                                {keyword.reply}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleKeyword(keyword)}
                                                className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
                                            >
                                                {keyword.isActive ? 'Disable' : 'Enable'}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDeleteKeyword(keyword.id)}
                                                disabled={deletingKeywordId === keyword.id}
                                                className="rounded-lg border border-red-100 px-3 py-2 text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                                            >
                                                {deletingKeywordId === keyword.id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={14} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}