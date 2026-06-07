'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    FileText,
    Loader2,
    RefreshCw,
    Search,
    Trash2,
    UploadCloud,
    X,
} from 'lucide-react';

type KnowledgeDoc = {
    id: string;
    file_name: string;
    file_url: string | null;
    content: string;
    is_active: boolean | null;
    metadata: any;
    created_at: string;
};

type ConfirmAction = {
    type: 'toggle' | 'delete';
    doc: KnowledgeDoc;
} | null;

export default function KnowledgeBasePage() {
    const [file, setFile] = useState<File | null>(null);
    const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
    const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const [status, setStatus] = useState<{
        type: 'idle' | 'success' | 'error';
        message: string;
    }>({ type: 'idle', message: '' });

    const fetchDocuments = async () => {
        setIsFetching(true);

        const { data, error } = await supabase
            .from('knowledge_base')
            .select('id,file_name,file_url,content,is_active,metadata,created_at')
            .order('created_at', { ascending: false });

        if (error) {
            setStatus({
                type: 'error',
                message: `Failed to fetch documents: ${error.message}`,
            });
            setDocuments([]);
        } else {
            setDocuments(data || []);
        }

        setIsFetching(false);
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const filteredDocuments = useMemo(() => {
        const keyword = searchQuery.trim().toLowerCase();

        if (!keyword) return documents;

        return documents.filter((doc) => {
            const fileName = doc.file_name?.toLowerCase() || '';
            const content = doc.content?.toLowerCase() || '';
            const statusText = doc.is_active ? 'active' : 'inactive';

            return (
                fileName.includes(keyword) ||
                content.includes(keyword) ||
                statusText.includes(keyword)
            );
        });
    }, [documents, searchQuery]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setIsLoading(true);
        setStatus({ type: 'idle', message: '' });

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/knowledge', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process document.');
            }

            setStatus({
                type: 'success',
                message: 'Document processed and added to Sisca knowledge base.',
            });

            setFile(null);
            await fetchDocuments();
        } catch (error: any) {
            setStatus({
                type: 'error',
                message: error.message || 'Upload failed. Please check the knowledge API.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmAction = async () => {
        if (!confirmAction) return;

        setIsActionLoading(true);

        try {
            if (confirmAction.type === 'toggle') {
                const { error } = await supabase
                    .from('knowledge_base')
                    .update({ is_active: !confirmAction.doc.is_active })
                    .eq('id', confirmAction.doc.id);

                if (error) throw error;

                setStatus({
                    type: 'success',
                    message: `Document has been ${confirmAction.doc.is_active ? 'disabled' : 'enabled'
                        }.`,
                });
            }

            if (confirmAction.type === 'delete') {
                const { error } = await supabase
                    .from('knowledge_base')
                    .delete()
                    .eq('id', confirmAction.doc.id);

                if (error) throw error;

                setStatus({
                    type: 'success',
                    message: 'Document chunk has been deleted from knowledge base.',
                });
            }

            setConfirmAction(null);
            await fetchDocuments();
        } catch (error: any) {
            setStatus({
                type: 'error',
                message: error.message || 'Action failed. Please check Supabase policy.',
            });
        } finally {
            setIsActionLoading(false);
        }
    };

    const formatDate = (date: string) =>
        new Date(date).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    const getContentPreview = (content: string) => {
        if (!content) return 'No content available.';
        return content.length > 140 ? `${content.slice(0, 140)}...` : content;
    };

    const getChunkLabel = (doc: KnowledgeDoc) => {
        const index = doc.metadata?.chunk_index;
        const total = doc.metadata?.total_chunks;

        if (typeof index === 'number' && typeof total === 'number') {
            return `Chunk ${index + 1} of ${total}`;
        }

        return 'Document Chunk';
    };

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                        Knowledge Base
                    </h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                        Upload and manage official documents used by Sisca RAG responses.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={fetchDocuments}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                    <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <section className="rounded-[1.4rem] border border-slate-200 bg-white p-7 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                <form onSubmit={handleUpload}>
                    <div className="group relative">
                        <div
                            className={`flex flex-col items-center justify-center rounded-[1.3rem] border border-dashed p-10 transition-all ${file
                                    ? 'border-[#E3000F] bg-red-50/20'
                                    : 'border-slate-300 bg-slate-50/70 group-hover:border-[#E3000F] group-hover:bg-red-50/10'
                                }`}
                        >
                            <input
                                type="file"
                                accept=".pdf,.docx,.xlsx,.csv"
                                onChange={(e) => {
                                    setFile(e.target.files?.[0] || null);
                                    setStatus({ type: 'idle', message: '' });
                                }}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            />

                            <div
                                className={`mb-4 rounded-2xl p-3 ${file
                                        ? 'bg-red-100 text-[#E3000F]'
                                        : 'bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 group-hover:text-[#E3000F]'
                                    }`}
                            >
                                {file ? <FileText size={25} /> : <UploadCloud size={25} />}
                            </div>

                            <h3 className="text-sm font-semibold text-slate-900">
                                {file ? file.name : 'Click or drag document into this area'}
                            </h3>

                            <p className="mt-1 text-[13px] font-medium text-slate-400">
                                PDF, DOCX, XLSX, or CSV document for academic information sources.
                            </p>
                        </div>
                    </div>

                    {status.type !== 'idle' && (
                        <div
                            className={`mt-5 flex items-start gap-3 rounded-2xl p-4 text-sm font-medium ${status.type === 'success'
                                    ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500/20'
                                    : 'bg-red-50 text-red-800 ring-1 ring-red-500/20'
                                }`}
                        >
                            {status.type === 'success' ? (
                                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                            ) : (
                                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            )}
                            <span>{status.message}</span>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <button
                            type="submit"
                            disabled={!file || isLoading}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#E3000F] px-5 py-3 text-[13px] font-semibold text-white shadow-sm shadow-red-500/20 transition hover:bg-[#C0000D] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                        >
                            {isLoading && <Loader2 className="animate-spin" size={16} />}
                            {isLoading ? 'Processing Embedding...' : 'Upload & Train AI'}
                        </button>
                    </div>
                </form>
            </section>

            <section className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-950">
                            Document Library
                        </h3>
                        <p className="text-[13px] font-medium text-slate-500">
                            Documents currently stored in the vector knowledge table.
                        </p>
                    </div>

                    <div className="relative w-full md:w-[360px]">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search document or content..."
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-[13px] font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1040px] text-left text-sm">
                        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                            <tr>
                                <th className="px-6 py-3">Document</th>
                                <th className="px-6 py-3">Content Preview</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Created</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {isFetching ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center font-medium text-slate-400">
                                        Loading documents...
                                    </td>
                                </tr>
                            ) : filteredDocuments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center font-medium text-slate-400">
                                        No documents found.
                                    </td>
                                </tr>
                            ) : (
                                filteredDocuments.map((doc) => {
                                    const isExpanded = expandedDocId === doc.id;

                                    return (
                                        <Fragment key={doc.id}>
                                            <tr
                                                onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                                                className="cursor-pointer transition hover:bg-slate-50/80"
                                            >
                                                <td className="px-6 py-4 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                                                            <FileText size={18} />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="max-w-[260px] truncate font-semibold text-slate-900">
                                                                {doc.file_name}
                                                            </div>
                                                            <div className="mt-0.5 text-[12px] font-medium text-slate-400">
                                                                {getChunkLabel(doc)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="max-w-[420px] px-6 py-4 align-top">
                                                    <p className="line-clamp-2 text-[13px] font-medium leading-6 text-slate-500">
                                                        {getContentPreview(doc.content)}
                                                    </p>
                                                </td>

                                                <td className="px-6 py-4 align-top">
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${doc.is_active
                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                : 'bg-slate-100 text-slate-500'
                                                            }`}
                                                    >
                                                        {doc.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 align-top text-[13px] font-medium text-slate-500">
                                                    {formatDate(doc.created_at)}
                                                </td>

                                                <td className="px-6 py-4 text-right align-top">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmAction({ type: 'toggle', doc });
                                                        }}
                                                        className="mr-2 rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
                                                    >
                                                        {doc.is_active ? 'Disable' : 'Enable'}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmAction({ type: 'delete', doc });
                                                        }}
                                                        className="rounded-lg border border-red-100 px-3 py-2 text-red-600 transition hover:bg-red-50"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>

                                            {isExpanded && (
                                                <tr className="bg-slate-50/70">
                                                    <td colSpan={5} className="px-6 pb-6 pt-0">
                                                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                                <div>
                                                                    <h4 className="text-sm font-semibold text-slate-900">
                                                                        Full Content
                                                                    </h4>
                                                                    <p className="text-[12px] font-medium text-slate-400">
                                                                        {doc.file_name} • {getChunkLabel(doc)}
                                                                    </p>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpandedDocId(null);
                                                                    }}
                                                                    className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                                                >
                                                                    <ChevronDown size={18} className="rotate-180" />
                                                                </button>
                                                            </div>

                                                            <div className="max-h-[360px] overflow-y-auto rounded-xl bg-slate-50 p-4">
                                                                <pre className="whitespace-pre-wrap break-words font-sans text-[13px] font-medium leading-7 text-slate-700">
                                                                    {doc.content || 'No content available.'}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {confirmAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-[2px]">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_28px_90px_-40px_rgba(15,23,42,0.8)]">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                                    {confirmAction.type === 'delete'
                                        ? 'Delete Knowledge Item'
                                        : confirmAction.doc.is_active
                                            ? 'Disable Knowledge Item'
                                            : 'Enable Knowledge Item'}
                                </h3>

                                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                                    {confirmAction.type === 'delete'
                                        ? 'This action will permanently remove the selected content from Sisca knowledge base.'
                                        : `This action will mark the selected content as ${confirmAction.doc.is_active ? 'inactive' : 'active'
                                        } for Sisca RAG responses.`}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setConfirmAction(null)}
                                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="truncate text-sm font-semibold text-slate-900">
                                {confirmAction.doc.file_name}
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-slate-500">
                                {getChunkLabel(confirmAction.doc)}
                            </p>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() => setConfirmAction(null)}
                                className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-100"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={handleConfirmAction}
                                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition disabled:bg-slate-300 ${confirmAction.type === 'delete'
                                        ? 'bg-[#E3000F] hover:bg-[#C0000D]'
                                        : 'bg-slate-900 hover:bg-slate-700'
                                    }`}
                            >
                                {isActionLoading && <Loader2 size={15} className="animate-spin" />}
                                {confirmAction.type === 'delete'
                                    ? 'Delete'
                                    : confirmAction.doc.is_active
                                        ? 'Disable'
                                        : 'Enable'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}