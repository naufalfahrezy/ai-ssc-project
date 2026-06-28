'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    Download,
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
    document_id: string | null;
    file_name: string;
    file_url: string | null;
    content: string;
    is_active: boolean | null;
    metadata: any;
    created_at: string;
};

type GroupedKnowledgeDoc = {
    file_name: string;
    document_id: string | null;
    chunks: KnowledgeDoc[];
    total_chunks: number;
    active_chunks: number;
    inactive_chunks: number;
    is_active: boolean;
    created_at: string;
    first_chunk: KnowledgeDoc;
};

type ConfirmAction =
    | {
        type: 'toggle' | 'deleteOptions' | 'deleteChunk' | 'deleteFile';
        doc: KnowledgeDoc;
    }
    | {
        type: 'deleteAll';
    }
    | null;

export default function KnowledgeBasePage() {
    const [file, setFile] = useState<File | null>(null);
    const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
    const [expandedFileName, setExpandedFileName] = useState<string | null>(null);
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
            .select('id,document_id,file_name,file_url,content,is_active,metadata,created_at')
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

    const groupedDocuments = useMemo<GroupedKnowledgeDoc[]>(() => {
        const map = new Map<string, KnowledgeDoc[]>();

        filteredDocuments.forEach((doc) => {
            const key = doc.file_name || 'Untitled Document';
            const current = map.get(key) || [];
            current.push(doc);
            map.set(key, current);
        });

        return Array.from(map.entries())
            .map(([fileName, chunks]) => {
                const sortedChunks = [...chunks].sort((a, b) => {
                    const chunkA =
                        typeof a.metadata?.chunk_index === 'number'
                            ? a.metadata.chunk_index
                            : 0;
                    const chunkB =
                        typeof b.metadata?.chunk_index === 'number'
                            ? b.metadata.chunk_index
                            : 0;

                    return chunkA - chunkB;
                });

                const firstChunk = sortedChunks[0];
                const activeChunks = sortedChunks.filter((chunk) => chunk.is_active).length;
                const inactiveChunks = sortedChunks.length - activeChunks;

                return {
                    file_name: fileName,
                    document_id:
                        firstChunk?.document_id ||
                        sortedChunks.find((chunk) => chunk.document_id)?.document_id ||
                        null,
                    chunks: sortedChunks,
                    total_chunks: sortedChunks.length,
                    active_chunks: activeChunks,
                    inactive_chunks: inactiveChunks,
                    is_active: activeChunks > 0,
                    created_at: firstChunk?.created_at || new Date().toISOString(),
                    first_chunk: firstChunk,
                };
            })
            .sort(
                (a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
    }, [filteredDocuments]);

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
        if (!confirmAction || confirmAction.type === 'deleteOptions') return;

        setIsActionLoading(true);

        try {
            if (confirmAction.type === 'toggle') {
                const { error } = await supabase
                    .from('knowledge_base')
                    .update({ is_active: !confirmAction.doc.is_active })
                    .eq('file_name', confirmAction.doc.file_name);

                if (error) throw error;

                setStatus({
                    type: 'success',
                    message: `Document has been ${
                        confirmAction.doc.is_active ? 'disabled' : 'enabled'
                    }.`,
                });
            }

            if (confirmAction.type === 'deleteChunk') {
                const { error } = await supabase
                    .from('knowledge_base')
                    .delete()
                    .eq('id', confirmAction.doc.id);

                if (error) throw error;

                setStatus({
                    type: 'success',
                    message: 'Selected chunk has been deleted from knowledge base.',
                });
            }

            if (confirmAction.type === 'deleteFile') {
                const { error } = await supabase
                    .from('knowledge_base')
                    .delete()
                    .eq('file_name', confirmAction.doc.file_name);

                if (error) throw error;

                setStatus({
                    type: 'success',
                    message: 'All chunks from the selected file have been deleted from knowledge base.',
                });
            }

            if (confirmAction.type === 'deleteAll') {
                const { error } = await supabase
                    .from('knowledge_base')
                    .delete()
                    .neq('id', '00000000-0000-0000-0000-000000000000');

                if (error) throw error;

                setStatus({
                    type: 'success',
                    message: 'All knowledge base data has been deleted.',
                });
            }

            setConfirmAction(null);
            setExpandedFileName(null);
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

    const getFilePreview = (group: GroupedKnowledgeDoc) => {
        const firstContent = group.chunks.find((chunk) => chunk.content)?.content || '';
        return getContentPreview(firstContent);
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

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setConfirmAction({ type: 'deleteAll' })}
                        disabled={isFetching || documents.length === 0}
                        className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-white px-4 py-2 text-[13px] font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:hover:bg-white"
                    >
                        <Trash2 size={15} />
                        Delete All
                    </button>

                    <button
                        type="button"
                        onClick={fetchDocuments}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                    >
                        <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            <section className="rounded-[1.4rem] border border-slate-200 bg-white p-7 shadow-[0_20px_65px_-55px_rgba(15,23,42,0.65)]">
                <form onSubmit={handleUpload}>
                    <div className="group relative">
                        <div
                            className={`flex flex-col items-center justify-center rounded-[1.3rem] border border-dashed p-10 transition-all ${
                                file
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
                                className={`mb-4 rounded-2xl p-3 ${
                                    file
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
                            className={`mt-5 flex items-start gap-3 rounded-2xl p-4 text-sm font-medium ${
                                status.type === 'success'
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
                                <th className="px-6 py-3">Chunks</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Created</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {isFetching ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center font-medium text-slate-400">
                                        Loading documents...
                                    </td>
                                </tr>
                            ) : groupedDocuments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center font-medium text-slate-400">
                                        No documents found.
                                    </td>
                                </tr>
                            ) : (
                                groupedDocuments.map((group) => {
                                    const isExpanded = expandedFileName === group.file_name;

                                    return (
                                        <Fragment key={group.file_name}>
                                            <tr
                                                onClick={() =>
                                                    setExpandedFileName(isExpanded ? null : group.file_name)
                                                }
                                                className="cursor-pointer transition hover:bg-slate-50/80"
                                            >
                                                <td className="px-6 py-4 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                                                            <FileText size={18} />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="max-w-[280px] truncate font-semibold text-slate-900">
                                                                {group.file_name}
                                                            </div>
                                                            <div className="mt-0.5 text-[12px] font-medium text-slate-400">
                                                                Click to view chunk details
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="max-w-[420px] px-6 py-4 align-top">
                                                    <p className="line-clamp-2 text-[13px] font-medium leading-6 text-slate-500">
                                                        {getFilePreview(group)}
                                                    </p>
                                                </td>

                                                <td className="px-6 py-4 align-top">
                                                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-100">
                                                        {group.total_chunks} chunk
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 align-top">
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                                            group.is_active
                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                : 'bg-slate-100 text-slate-500'
                                                        }`}
                                                    >
                                                        {group.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 align-top text-[13px] font-medium text-slate-500">
                                                    {formatDate(group.created_at)}
                                                </td>

                                                <td className="px-6 py-4 text-right align-top">
                                                    {group.document_id ? (
                                                        <a
                                                            href={`/api/knowledge/download?id=${group.document_id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="mr-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
                                                        >
                                                            <Download size={14} />
                                                            Download
                                                        </a>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="mr-2 inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-300"
                                                        >
                                                            <Download size={14} />
                                                            Download
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmAction({
                                                                type: 'toggle',
                                                                doc: {
                                                                    ...group.first_chunk,
                                                                    is_active: group.is_active,
                                                                },
                                                            });
                                                        }}
                                                        className="mr-2 rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
                                                    >
                                                        {group.is_active ? 'Disable' : 'Enable'}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmAction({
                                                                type: 'deleteOptions',
                                                                doc: group.first_chunk,
                                                            });
                                                        }}
                                                        className="rounded-lg border border-red-100 px-3 py-2 text-red-600 transition hover:bg-red-50"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>

                                            {isExpanded && (
                                                <tr className="bg-slate-50/70">
                                                    <td colSpan={6} className="px-6 pb-6 pt-0">
                                                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                                            <div className="mb-4 flex items-center justify-between gap-3">
                                                                <div>
                                                                    <h4 className="text-sm font-semibold text-slate-900">
                                                                        Chunk Details
                                                                    </h4>
                                                                    <p className="text-[12px] font-medium text-slate-400">
                                                                        {group.file_name} • {group.total_chunks} chunk(s)
                                                                    </p>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpandedFileName(null);
                                                                    }}
                                                                    className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                                                >
                                                                    <ChevronDown size={18} className="rotate-180" />
                                                                </button>
                                                            </div>

                                                            <div className="space-y-3">
                                                                {group.chunks.map((chunk) => (
                                                                    <div
                                                                        key={chunk.id}
                                                                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                                                                    >
                                                                        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                                            <div>
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                                                                        {getChunkLabel(chunk)}
                                                                                    </span>

                                                                                    <span
                                                                                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                                                                            chunk.is_active
                                                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                                                : 'bg-slate-100 text-slate-500'
                                                                                        }`}
                                                                                    >
                                                                                        {chunk.is_active ? 'Active' : 'Inactive'}
                                                                                    </span>
                                                                                </div>

                                                                                <p className="mt-2 text-[12px] font-medium text-slate-400">
                                                                                    Created {formatDate(chunk.created_at)}
                                                                                </p>
                                                                            </div>

                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setConfirmAction({
                                                                                            type: 'deleteChunk',
                                                                                            doc: chunk,
                                                                                        });
                                                                                    }}
                                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-2 text-[12px] font-semibold text-red-600 transition hover:bg-red-50"
                                                                                >
                                                                                    <Trash2 size={13} />
                                                                                    Delete Chunk
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        <div className="max-h-[260px] overflow-y-auto rounded-xl bg-white p-4 ring-1 ring-slate-100">
                                                                            <pre className="whitespace-pre-wrap break-words font-sans text-[13px] font-medium leading-7 text-slate-700">
                                                                                {chunk.content || 'No content available.'}
                                                                            </pre>
                                                                        </div>
                                                                    </div>
                                                                ))}
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
                        {confirmAction.type === 'deleteOptions' ? (
                            <>
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                                            Delete Knowledge Item
                                        </h3>

                                        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                                            Choose whether to delete only a selected chunk from detail view or delete all chunks from this file.
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
                                        File document
                                    </p>
                                </div>

                                <div className="grid gap-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setConfirmAction({
                                                type: 'deleteFile',
                                                doc: confirmAction.doc,
                                            })
                                        }
                                        className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-left transition hover:bg-red-100"
                                    >
                                        <p className="text-[13px] font-semibold text-red-700">
                                            Delete entire file
                                        </p>
                                        <p className="mt-1 text-[12px] font-medium leading-5 text-red-600/80">
                                            Remove all chunks with this file name from the knowledge base.
                                        </p>
                                    </button>
                                </div>

                                <div className="mt-5 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setConfirmAction(null)}
                                        className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                                            {confirmAction.type === 'deleteAll'
                                                ? 'Delete All Knowledge Base'
                                                : confirmAction.type === 'deleteFile'
                                                    ? 'Delete Entire File'
                                                    : confirmAction.type === 'deleteChunk'
                                                        ? 'Delete Knowledge Chunk'
                                                        : confirmAction.doc.is_active
                                                            ? 'Disable Knowledge File'
                                                            : 'Enable Knowledge File'}
                                        </h3>

                                        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                                            {confirmAction.type === 'deleteAll'
                                                ? 'This action will permanently remove all data from Sisca knowledge base.'
                                                : confirmAction.type === 'deleteFile'
                                                    ? 'This action will permanently remove all chunks from the selected file.'
                                                    : confirmAction.type === 'deleteChunk'
                                                        ? 'This action will permanently remove only the selected chunk from Sisca knowledge base.'
                                                        : `This action will mark all chunks in the selected file as ${
                                                              confirmAction.doc.is_active ? 'inactive' : 'active'
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
                                    {confirmAction.type === 'deleteAll' ? (
                                        <>
                                            <p className="text-sm font-semibold text-slate-900">
                                                All knowledge base data
                                            </p>
                                            <p className="mt-1 text-[12px] font-medium text-slate-500">
                                                {documents.length} chunk(s) will be removed.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                {confirmAction.doc.file_name}
                                            </p>
                                            <p className="mt-1 text-[12px] font-medium text-slate-500">
                                                {confirmAction.type === 'deleteFile'
                                                    ? 'All chunks from this file'
                                                    : confirmAction.type === 'deleteChunk'
                                                        ? getChunkLabel(confirmAction.doc)
                                                        : 'All chunks from this file'}
                                            </p>
                                        </>
                                    )}
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
                                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition disabled:bg-slate-300 ${
                                            confirmAction.type === 'deleteChunk' ||
                                            confirmAction.type === 'deleteFile' ||
                                            confirmAction.type === 'deleteAll'
                                                ? 'bg-[#E3000F] hover:bg-[#C0000D]'
                                                : 'bg-slate-900 hover:bg-slate-700'
                                        }`}
                                    >
                                        {isActionLoading && <Loader2 size={15} className="animate-spin" />}
                                        {confirmAction.type === 'deleteAll'
                                            ? 'Delete All'
                                            : confirmAction.type === 'deleteFile'
                                                ? 'Delete File'
                                                : confirmAction.type === 'deleteChunk'
                                                    ? 'Delete Chunk'
                                                    : confirmAction.doc.is_active
                                                        ? 'Disable File'
                                                        : 'Enable File'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}