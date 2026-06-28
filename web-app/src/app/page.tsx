'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import SiscaLogo from '@/components/SiscaLogo';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Bot,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Database,
  Download,
  FileText,
  Headphones,
  Loader2,
  MessageCircle,
  MessageSquare,
  Phone,
  Power,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  Star,
  UploadCloud,
  User,
  X,
  Zap,
  Check,
  Copy,
  FileSearch,
  Info,
} from 'lucide-react';

type ChatRole = 'bot' | 'user';
type ChatStep = 'onboarding' | 'chatting' | 'ticketing' | 'feedback';

type ChatSource =
  | string
  | {
      document_id?: string | null;
      documentId?: string | null;
      file_name?: string | null;
      fileName?: string | null;
      name?: string | null;
      source?: string | null;
      download_url?: string | null;
      downloadUrl?: string | null;
    };

type NormalizedSource = {
  fileName: string;
  downloadUrl: string | null;
};

type ChatMessage = {
  role: ChatRole;
  content: string;
  sources?: ChatSource[];
};

type WaGatewayStatus = {
  connected?: boolean;
  phone?: string;
  message?: string;
  settings?: {
    botEnabled?: boolean;
    quotedReply?: boolean;
    responseMode?: string;
  };
};

const WA_GATEWAY_STATUS_URL = 'https://ai-ssc-project-production.up.railway.app/status';

const INITIAL_MESSAGE: ChatMessage = {
  role: 'bot',
  content:
    'Halo Kak! Aku Sisca, asisten akademik virtual Telkom University Surabaya. Ada yang bisa Sisca bantu hari ini?',
};

const faqs = [
  {
    q: 'Apa itu Sisca Platform?',
    a: 'Sisca adalah Student Information & Service Center Assistant, yaitu asisten virtual akademik yang membantu mahasiswa mendapatkan informasi layanan SSC secara cepat melalui web dan WhatsApp.',
  },
  {
    q: 'Apakah jawaban Sisca bisa dipercaya?',
    a: 'Jawaban Sisca dirancang berbasis dokumen resmi yang diunggah oleh admin SSC melalui sistem knowledge base, sehingga respons AI tetap mengacu pada sumber dokumen internal.',
  },
  {
    q: 'Kapan saya bisa menggunakan Sisca?',
    a: 'Sisca dapat digunakan 24/7. Untuk layanan tatap muka atau penyerahan dokumen fisik, mahasiswa tetap mengikuti jam operasional SSC: Senin sampai Jumat pukul 08.00 - 16.00 WIB.',
  },
  {
    q: 'Bagaimana jika pertanyaan saya tidak bisa dijawab AI?',
    a: 'Sisca akan menyarankan pembuatan tiket laporan. Data laporan akan diteruskan kepada staf SSC agar dapat ditindaklanjuti melalui WhatsApp.',
  },
  {
    q: 'Apakah Sisca terhubung dengan WhatsApp?',
    a: 'Ya. Sisca disiapkan sebagai layanan omnichannel, yaitu dapat digunakan melalui web sebagai kanal utama dan WhatsApp sebagai kanal tambahan.',
  },
];

const featureCards = [
  {
    title: 'Layanan Informasi 24/7',
    desc: 'Mahasiswa dapat bertanya tentang layanan akademik kapan saja tanpa harus menunggu loket SSC dibuka.',
    icon: Clock,
  },
  {
    title: 'Jawaban Berbasis Dokumen',
    desc: 'Respons AI menggunakan pendekatan RAG sehingga informasi yang diberikan mengacu pada dokumen knowledge base kampus.',
    icon: BookOpen,
  },
  {
    title: 'Sitasi Sumber Referensi',
    desc: 'Setiap jawaban dapat diarahkan untuk menampilkan sumber dokumen agar mahasiswa mengetahui dasar informasinya.',
    icon: FileText,
  },
  {
    title: 'Floating Chat Widget',
    desc: 'Chatbot tampil sebagai tombol melayang di pojok halaman sehingga mudah diakses dari landing page.',
    icon: MessageCircle,
  },
  {
    title: 'Tiket Laporan Kendala',
    desc: 'Jika pertanyaan berada di luar knowledge base, mahasiswa dapat mengirim laporan untuk ditindaklanjuti staf SSC.',
    icon: ClipboardList,
  },
  {
    title: 'Integrasi WhatsApp',
    desc: 'Mahasiswa tetap dapat menggunakan kanal WhatsApp untuk menerima informasi akademik dengan pengalaman yang familiar.',
    icon: Smartphone,
  },
];

const workflowSteps = [
  {
    title: 'Mahasiswa Bertanya',
    desc: 'Pertanyaan dikirim melalui chat web atau WhatsApp.',
    icon: MessageSquare,
  },
  {
    title: 'AI Mencari Referensi',
    desc: 'Sistem mencari potongan dokumen paling relevan di knowledge base.',
    icon: Database,
  },
  {
    title: 'Jawaban Diberikan',
    desc: 'Sisca menjawab dengan bahasa ramah dan menyertakan sumber referensi.',
    icon: Bot,
  },
  {
    title: 'Eskalasi Bila Perlu',
    desc: 'Jika informasi tidak ditemukan, pengguna diarahkan membuat tiket laporan.',
    icon: Headphones,
  },
];

const adminFeatures = [
  'Unggah dokumen PDF, DOCX, atau XLSX ke knowledge base.',
  'Kelola dokumen aktif sebagai referensi jawaban AI.',
  'Pantau riwayat obrolan dari web dan WhatsApp.',
  'Lihat daftar kontak dan nonaktifkan bot untuk balasan manual.',
  'Tindak lanjuti tiket laporan melalui template WhatsApp.',
  'Pantau status API AI dan koneksi WhatsApp service.',
];

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showChannelOptions, setShowChannelOptions] = useState(false);
  const [waGatewayStatus, setWaGatewayStatus] = useState<WaGatewayStatus | null>(null);
  const [isCheckingWaStatus, setIsCheckingWaStatus] = useState(false);
  const [chatStep, setChatStep] = useState<ChatStep>('onboarding');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userData, setUserData] = useState({ name: '', nim: '', waNumber: '' });
  const [ticketForm, setTicketForm] = useState({
    name: '',
    nim: '',
    waNumber: '',
    description: '',
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [downloadConfirmSource, setDownloadConfirmSource] = useState<NormalizedSource | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [hasHydratedChatState, setHasHydratedChatState] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([INITIAL_MESSAGE]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedState = window.localStorage.getItem('sisca_chat_state');
    if (!savedState) return;

    try {
      const parsed = JSON.parse(savedState);
      if (parsed.userData) setUserData(parsed.userData);
      if (parsed.sessionId) setSessionId(parsed.sessionId);
      if (parsed.chatHistory?.length) setChatHistory(parsed.chatHistory);
      if (parsed.chatStep && parsed.chatStep !== 'feedback') setChatStep(parsed.chatStep);
    } catch (error) {
      console.warn('Gagal membaca sesi chat Sisca:', error);
    } finally {
      setHasHydratedChatState(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedChatState) return;

    window.localStorage.setItem(
      'sisca_chat_state',
      JSON.stringify({ sessionId, userData, chatHistory, chatStep })
    );
  }, [hasHydratedChatState, sessionId, userData, chatHistory, chatStep]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading, chatStep]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 420);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const revealElements = document.querySelectorAll<HTMLElement>('.sisca-reveal');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          window.requestAnimationFrame(() => {
            entry.target.classList.add('sisca-visible');
          });
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const persistChatHistory = async (nextHistory: ChatMessage[]) => {
    if (!sessionId) return;

    await supabase
      .from('chat_sessions')
      .update({
        chat_history: nextHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
  };

  const needsHumanAssistance = (text: string) => {
    const lowerText = text.toLowerCase();
    return (
      lowerText.includes('maaf') ||
      lowerText.includes('tidak ditemukan') ||
      lowerText.includes('di luar konteks') ||
      lowerText.includes('belum mengetahui') ||
      lowerText.includes('formulir laporan') ||
      lowerText.includes('form laporan') ||
      lowerText.includes('tidak dapat menjawab')
    );
  };

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData.name.trim() || !userData.waNumber.trim()) return;

    setIsStartingChat(true);

    const welcomeHistory: ChatMessage[] = [
      {
        role: 'bot',
        content: `Halo Kak ${userData.name}! 👋\nSisca siap membantu informasi akademik TUS. Silakan tanyakan hal seperti KRS, jadwal layanan SSC, pedoman akademik, atau prosedur administrasi.`,
      },
    ];

    try {
      const { error: contactError } = await supabase.from('wa_contacts').upsert(
        {
          wa_number: userData.waNumber,
          name: userData.name,
          last_interaction: new Date().toISOString(),
          is_bot_active: true,
        },
        { onConflict: 'wa_number' }
      );

      if (contactError) throw contactError;

      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          source: 'web',
          user_identifier: userData.waNumber,
          user_name: userData.name,
          chat_history: welcomeHistory,
        })
        .select('id')
        .single();

      if (sessionError) throw sessionError;

      setSessionId(sessionData?.id ?? null);
      setTicketForm({
        name: userData.name,
        nim: userData.nim,
        waNumber: userData.waNumber,
        description: '',
      });
      setChatHistory(welcomeHistory);
      setChatStep('chatting');
    } catch (error) {
      console.error('Gagal memulai sesi Sisca:', error);
      alert('Sesi chat belum bisa dimulai. Periksa koneksi Supabase dan policy tabel yang digunakan.');
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMsg = message.trim();
    const historyWithUser: ChatMessage[] = [...chatHistory, { role: 'user', content: userMsg }];

    setMessage('');
    setChatHistory(historyWithUser);
    setIsLoading(true);
    await persistChatHistory(historyWithUser);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          source: 'web',
          userIdentifier: userData.waNumber,
          userName: userData.name,
          sessionId,
        }),
      });

      const data = await response.json();
      const botReply = response.ok
        ? data.reply
        : `Maaf Kak, sistem Sisca sedang mengalami kendala: ${data.error ?? 'server tidak merespons'}`;

      const historyWithBot: ChatMessage[] = [
        ...historyWithUser,
        {
          role: 'bot',
          content: botReply,
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ];
      setChatHistory(historyWithBot);
      await persistChatHistory(historyWithBot);
    } catch (error) {
      const errorHistory: ChatMessage[] = [
        ...historyWithUser,
        {
          role: 'bot',
          content:
            'Maaf Kak, Sisca kesulitan terhubung ke server. Coba ulangi beberapa saat lagi atau buat tiket laporan bila kendala masih terjadi.',
        },
      ];

      setChatHistory(errorHistory);
      await persistChatHistory(errorHistory);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenTicketForm = () => {
    setTicketForm({
      name: userData.name,
      nim: userData.nim,
      waNumber: userData.waNumber,
      description: '',
    });
    setChatStep('ticketing');
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.name.trim() || !ticketForm.waNumber.trim() || !ticketForm.description.trim()) return;

    setIsSubmittingTicket(true);

    try {
      const issueDescription = [
        ticketForm.nim ? `NIM: ${ticketForm.nim}` : 'NIM: -',
        '',
        `Deskripsi Kendala: ${ticketForm.description}`,
      ].join('\n');

      const { error } = await supabase.from('tickets').insert({
        pelapor_name: ticketForm.name,
        pelapor_wa: ticketForm.waNumber,
        issue_description: issueDescription,
        status: 'pending',
      });

      if (error) throw error;

      const updatedHistory: ChatMessage[] = [
        ...chatHistory,
        {
          role: 'bot',
          content:
            'Tiket laporan berhasil dibuat. Staf SSC akan meninjau laporan Kakak pada jam kerja dan dapat menghubungi melalui WhatsApp yang dicantumkan.',
        },
      ];

      setChatHistory(updatedHistory);
      await persistChatHistory(updatedHistory);
      setChatStep('chatting');
    } catch (error) {
      console.error('Gagal membuat tiket:', error);
      alert('Tiket belum berhasil dibuat. Periksa koneksi Supabase dan policy tabel tickets.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleEndSession = () => setShowEndConfirm(true);

  const handleSubmitFeedback = async () => {
    if (feedbackRating === 0) return;

    if (sessionId) {
      await supabase
        .from('chat_sessions')
        .update({
          rating: feedbackRating,
          feedback_message: feedbackMessage.trim() || null,
          chat_history: chatHistory,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    }

    setChatStep('onboarding');
    setSessionId(null);
    setChatHistory([INITIAL_MESSAGE]);
    setUserData({ name: '', nim: '', waNumber: '' });
    setTicketForm({ name: '', nim: '', waNumber: '', description: '' });
    setFeedbackRating(0);
    setHoverRating(0);
    setFeedbackMessage('');
    setShowEndConfirm(false);
    setIsChatOpen(false);
    window.localStorage.removeItem('sisca_chat_state');
  };

  const extractSourcesFromText = (text: string) => {
    const sourceMatch = text.match(/Sumber referensi:\s*([\s\S]*)/i);

    if (!sourceMatch || sourceMatch.index === undefined) {
      return { cleanText: text.trim(), sources: [] as ChatSource[] };
    }

    const beforeSource = text.slice(0, sourceMatch.index).trim();
    const sourceSection = sourceMatch[1].split(/Office Hours:/i)[0];

    const sources = sourceSection
      .split('\n')
      .map((line) => line.replace(/^[-•*\s]+/, '').trim())
      .filter((line) => line && !line.toLowerCase().includes('tidak ditemukan'));

    return {
      cleanText: beforeSource,
      sources,
    };
  };

  const formatInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-inherit">
            {part.slice(2, -2)}
          </strong>
        );
      }

      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <strong key={index} className="font-semibold text-inherit">
            {part.slice(1, -1)}
          </strong>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  const renderFormattedMessage = (content: string) => {
    const { cleanText } = extractSourcesFromText(content);
    const lines = cleanText.split('\n').filter((line) => line.trim() !== '');

    const elements: ReactNode[] = [];
    let orderedItems: string[] = [];
    let unorderedItems: string[] = [];

    const flushOrdered = () => {
      if (!orderedItems.length) return;

      elements.push(
        <ol key={`ol-${elements.length}`} className="my-2 list-decimal space-y-1 pl-5">
          {orderedItems.map((item, idx) => (
            <li key={idx}>{formatInlineMarkdown(item)}</li>
          ))}
        </ol>
      );

      orderedItems = [];
    };

    const flushUnordered = () => {
      if (!unorderedItems.length) return;

      elements.push(
        <ul key={`ul-${elements.length}`} className="my-2 list-disc space-y-1 pl-5">
          {unorderedItems.map((item, idx) => (
            <li key={idx}>{formatInlineMarkdown(item)}</li>
          ))}
        </ul>
      );

      unorderedItems = [];
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const orderedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
      const unorderedMatch = trimmed.match(/^[-*•]\s+(.+)$/);

      if (orderedMatch) {
        flushUnordered();
        orderedItems.push(orderedMatch[2]);
        return;
      }

      if (unorderedMatch) {
        flushOrdered();
        unorderedItems.push(unorderedMatch[1]);
        return;
      }

      flushOrdered();
      flushUnordered();

      elements.push(
        <p key={`p-${index}`} className="mb-2 last:mb-0">
          {formatInlineMarkdown(trimmed)}
        </p>
      );
    });

    flushOrdered();
    flushUnordered();

    if (!elements.length) {
      return <p>{formatInlineMarkdown(cleanText)}</p>;
    }

    return elements;
  };

  const getMessageSources = (chat: ChatMessage) => {
    if (chat.sources?.length) return chat.sources;

    return extractSourcesFromText(chat.content).sources;
  };

  const normalizeSource = (source: ChatSource): NormalizedSource => {
    if (typeof source === 'string') {
      return {
        fileName: source,
        downloadUrl: null,
      };
    }

    const fileName =
      source.file_name ||
      source.fileName ||
      source.name ||
      source.source ||
      'Dokumen referensi';

    const documentId = source.document_id || source.documentId || null;
    const downloadUrl =
      source.download_url ||
      source.downloadUrl ||
      (documentId ? `/api/knowledge/download?id=${encodeURIComponent(documentId)}` : null);

    return {
      fileName,
      downloadUrl,
    };
  };

  const normalizeSources = (sources: ChatSource[]) => {
    const unique = new Map<string, NormalizedSource>();

    sources.forEach((source) => {
      const normalized = normalizeSource(source);
      const key = `${normalized.fileName}-${normalized.downloadUrl || 'no-download'}`;

      if (!unique.has(key)) {
        unique.set(key, normalized);
      }
    });

    return Array.from(unique.values());
  };

  const handleOpenDownloadConfirm = (source: NormalizedSource) => {
    if (!source.downloadUrl) return;
    setDownloadConfirmSource(source);
  };

  const handleConfirmDownload = () => {
    if (!downloadConfirmSource?.downloadUrl) return;

    window.open(downloadConfirmSource.downloadUrl, '_blank', 'noopener,noreferrer');
    setDownloadConfirmSource(null);
  };

  const handleCopyResponse = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageIndex(index);
      setTimeout(() => setCopiedMessageIndex(null), 1600);
    } catch (error) {
      console.error('Failed to copy response:', error);
    }
  };

  const normalizeWhatsAppNumber = (phone?: string) => {
    if (!phone) return '';

    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
      cleaned = `62${cleaned.slice(1)}`;
    }

    return cleaned;
  };

  const waBotNumber = normalizeWhatsAppNumber(waGatewayStatus?.phone);
  const isWhatsAppBotAvailable = Boolean(waGatewayStatus?.connected && waBotNumber);

  const fetchWaGatewayStatus = async () => {
    setIsCheckingWaStatus(true);

    try {
      const response = await fetch(WA_GATEWAY_STATUS_URL, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) throw new Error('Gagal mengambil status WhatsApp Gateway');

      const data: WaGatewayStatus = await response.json();
      setWaGatewayStatus(data);
    } catch (error) {
      console.error('Gagal mengecek status WhatsApp Gateway:', error);
      setWaGatewayStatus(null);
    } finally {
      setIsCheckingWaStatus(false);
    }
  };

  const handleToggleChannelOptions = async () => {
    const nextValue = !showChannelOptions;
    setShowChannelOptions(nextValue);

    if (nextValue) {
      await fetchWaGatewayStatus();
    }
  };

  const handleOpenChannelOptions = async () => {
    setIsChatOpen(false);
    setShowChannelOptions(true);
    await fetchWaGatewayStatus();
  };

  const handleOpenWebChat = () => {
    setShowChannelOptions(false);
    setIsChatOpen(true);
  };

  const handleOpenWhatsAppBot = () => {
    if (!isWhatsAppBotAvailable) return;

    const text = encodeURIComponent('Halo Sisca, saya ingin bertanya seputar layanan akademik TUS.');
    window.open(`https://wa.me/${waBotNumber}?text=${text}`, '_blank', 'noopener,noreferrer');
    setShowChannelOptions(false);
  };

  const feedbackMeta = {
    1: { emoji: '😞', label: 'Sangat kurang' },
    2: { emoji: '🙁', label: 'Kurang' },
    3: { emoji: '😐', label: 'Cukup' },
    4: { emoji: '🙂', label: 'Baik' },
    5: { emoji: '😍', label: 'Sangat baik' },
  } as const;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FBFCFD] font-[Figtree,ui-sans-serif,system-ui,sans-serif] text-slate-900 selection:bg-red-100 selection:text-red-900">
      <style jsx global>{`
        @import url('https://fonts.bunny.net/css?family=figtree:400,500,600,700&display=swap');
        html {
          font-family: 'Figtree', ui-sans-serif, system-ui, sans-serif;
          scroll-behavior: smooth;
          overflow-x: hidden;
        }
        body {
          background: #FBFCFD;
          overflow-x: hidden;
        }
        .sisca-reveal {
          opacity: 0;
          transform: translate3d(0, 18px, 0);
          transition: opacity 520ms ease-out, transform 520ms ease-out;
        }
        .sisca-reveal.sisca-visible {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto !important; }
          .sisca-reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(circle_at_50%_0%,rgba(227,0,15,0.075),transparent_42%),linear-gradient(180deg,#FFFFFF_0%,#FBFCFD_78%)]" />

      {/* NAVBAR */}
      <nav className="fixed top-0 z-40 w-full border-b border-slate-100 bg-white/90 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 md:px-6">
          <a href="#beranda" className="flex w-40 items-center gap-2 md:w-48">
            <SiscaLogo className="h-8 w-8" />
            <span className="text-xl font-semibold tracking-tight text-slate-900">
              Sisca<span className="text-[#E3000F]">.</span>
            </span>
          </a>

          <div className="hidden items-center gap-8 text-[13px] font-medium text-slate-500 md:flex">
            <a href="#fitur" className="transition-colors hover:text-slate-900">Fitur</a>
            <a href="#integrasi" className="transition-colors hover:text-slate-900">Integrasi</a>
            <a href="#cara-kerja" className="transition-colors hover:text-slate-900">Cara Kerja</a>
            <a href="#faq" className="transition-colors hover:text-slate-900">FAQ</a>
          </div>

          <div className="flex w-40 items-center justify-end md:w-48">
            <a href="/login" className="text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900">
              Login Admin
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="beranda" className="relative mx-auto flex min-h-[calc(100svh-74px)] w-full max-w-6xl flex-col items-center justify-center px-5 pb-16 pt-28 text-center sm:min-h-[calc(100svh-78px)] md:px-6 md:pb-20 md:pt-32">
        <div className="mb-7 flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E3000F]" />
            AI-SSC Platform
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            <Building2 size={12} /> Telkom University Surabaya
          </div>
        </div>

        <h1 className="max-w-5xl text-[2.85rem] font-semibold leading-[1.05] tracking-[-0.045em] text-slate-900 text-balance md:text-[4.9rem]">
          Layanan Akademik TUS, Lebih Cepat dengan Sisca.
        </h1>
        <p className="mt-7 max-w-2xl text-[16px] font-medium leading-8 text-slate-500 md:text-lg">
          Sisca membantu mahasiswa mendapatkan informasi akademik, pedoman layanan, dan arahan pelaporan kendala melalui AI berbasis dokumen resmi kampus.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleOpenChannelOptions}
            className="inline-flex items-center gap-2 rounded-full bg-[#E3000F] px-7 py-4 text-[14px] font-semibold text-white shadow-[0_15px_35px_-18px_rgba(227,0,15,0.9)] transition-all hover:-translate-y-0.5 hover:bg-[#C0000D]"
          >
            Mulai Tanya Sisca <ArrowRight size={17} />
          </button>
          <a
            href="#fitur"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-4 text-[14px] font-semibold text-slate-800 transition-all hover:-translate-y-0.5 hover:bg-slate-50"
          >
            Lihat Fitur
          </a>
        </div>

        <div className="mt-14 grid w-full max-w-5xl gap-4 md:grid-cols-3">
          {[
            { label: 'Jam SSC', value: '08.00 - 16.00 WIB', desc: 'Senin - Jumat' },
            { label: 'Kanal Layanan', value: 'Web & WhatsApp', desc: 'Omnichannel assistant' },
            { label: 'Basis Jawaban', value: 'Dokumen Resmi', desc: 'Knowledge base kampus' },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.4rem] border border-slate-200/70 bg-white/75 p-6 text-left shadow-[0_18px_60px_-44px_rgba(15,23,42,0.45)] backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">{item.value}</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <section className="sisca-reveal border-y border-slate-200/70 bg-[#F7F8FA] py-24">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-2 md:px-6">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <AlertTriangle size={12} className="text-[#E3000F]" /> Permasalahan
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">SSC masih terbatas oleh jam layanan dan proses manual.</h2>
          </div>
          <div className="space-y-4 text-[15px] font-medium leading-8 text-slate-500">
            <p>
              Mahasiswa sering membutuhkan informasi di luar jam kerja, sedangkan layanan onsite membuat mahasiswa harus datang langsung ke SSC untuk mendapatkan kepastian informasi.
            </p>
            <p>
              Sisca menjadi solusi awal berupa asisten virtual yang bisa menjawab pertanyaan umum berbasis knowledge base, sekaligus menyediakan tiket laporan ketika kendala tidak bisa dijawab otomatis.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="fitur" className="sisca-reveal py-24">
        <div className="mx-auto max-w-6xl px-5 md:px-6">
          <div className="mb-14 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <Zap size={12} className="text-[#E3000F]" /> Fitur Utama
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">Dirancang untuk mahasiswa dan staf SSC.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] font-medium leading-7 text-slate-500">
              Tampilan dibuat minimal, bersih, dan informatif seperti gaya Wapisender, tetapi isinya disesuaikan dengan kebutuhan layanan akademik TUS.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="group rounded-[1.35rem] border border-slate-200/70 bg-white p-7 shadow-[0_16px_50px_-46px_rgba(15,23,42,0.5)] transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_25px_70px_-45px_rgba(15,23,42,0.42)]">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 transition-colors group-hover:text-[#E3000F]">
                    <Icon size={23} strokeWidth={1.7} />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">{feature.title}</h3>
                  <p className="mt-3 text-[14px] font-medium leading-7 text-slate-500">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* INTEGRATION */}
      <section id="integrasi" className="sisca-reveal border-y border-slate-200/70 bg-[#F7F8FA] py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2 md:px-6">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <Database size={12} className="text-[#E3000F]" /> RAG Architecture
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">Integrasi AI, knowledge base, dan WhatsApp dalam satu alur.</h2>
            <p className="mt-5 text-[15px] font-medium leading-8 text-slate-500">
              Admin cukup mengelola dokumen akademik. Sistem memproses dokumen menjadi embedding, menyimpannya di database vektor, lalu chatbot mengambil konteks paling relevan saat mahasiswa bertanya.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                'Next.js + Tailwind CSS',
                'Supabase PostgreSQL + pgvector',
                'LangChain.js + LLM API',
                'Node.js WhatsApp Service',
              ].map((tech) => (
                <div key={tech} className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-[13px] font-medium text-slate-700">
                  <CheckCircle2 size={16} className="text-[#E3000F]" /> {tech}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-900 p-4 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.75)]">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-900">Sisca RAG</span>
            </div>
            <div className="space-y-3 font-mono text-[12px] leading-6 text-slate-300">
              <p><span className="text-red-300">user.ask</span>("Kapan batas pengajuan KRS?")</p>
              <p><span className="text-sky-300">retrieve</span>(knowledge_base, embedding)</p>
              <p><span className="text-emerald-300">context</span> = Pedoman_Akademik_2025.pdf</p>
              <p><span className="text-purple-300">answer</span> = response + source_reference</p>
              <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
                "Batas pengajuan KRS mengikuti kalender akademik yang berlaku. Sumber referensi: Pedoman_Akademik_2025.pdf"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="cara-kerja" className="sisca-reveal py-24">
        <div className="mx-auto max-w-6xl px-5 md:px-6">
          <div className="mb-14 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <Settings size={12} className="text-[#E3000F]" /> Cara Kerja
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">Dari pertanyaan ke jawaban dalam beberapa langkah.</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-4">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative rounded-3xl border border-slate-100 bg-white p-7 shadow-[0_20px_70px_-50px_rgba(15,23,42,0.45)]">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-700">
                      <Icon size={21} strokeWidth={1.7} />
                    </div>
                    <span className="text-3xl font-semibold tracking-tight text-slate-100">0{index + 1}</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-3 text-[13px] font-medium leading-6 text-slate-500">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ADMIN */}
      <section className="sisca-reveal border-y border-slate-200/70 bg-[#F7F8FA] py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2 md:px-6">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_25px_80px_-55px_rgba(15,23,42,0.5)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Admin Preview</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Knowledge Base</h3>
              </div>
              <button className="rounded-full bg-[#E3000F] px-4 py-2 text-[12px] font-semibold text-white">Upload</button>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Pedoman_Akademik_2025.pdf', status: 'Aktif' },
                { name: 'SOP_Layanan_SSC.docx', status: 'Aktif' },
                { name: 'Kalender_Akademik.xlsx', status: 'Diproses' },
              ].map((doc) => (
                <div key={doc.name} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#E3000F]">
                      <UploadCloud size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{doc.name}</p>
                      <p className="text-[12px] font-medium text-slate-400">Parsing → Chunking → Embedding</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">{doc.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <ShieldCheck size={12} className="text-[#E3000F]" /> Dashboard Admin
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">Staf SSC dapat memperbarui informasi tanpa coding.</h2>
            <div className="mt-7 grid gap-3">
              {adminFeatures.map((item) => (
                <div key={item} className="flex items-start gap-3 text-[14px] font-medium leading-6 text-slate-600">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#E3000F]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="sisca-reveal mx-auto max-w-3xl px-5 py-24 md:px-6">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            <MessageSquare size={12} className="text-[#E3000F]" /> FAQ
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">Punya pertanyaan?</h2>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            Beberapa informasi dasar dapat dibaca langsung tanpa membuka chatbot.
          </p>
        </div>

        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {faqs.map((faq, idx) => (
            <div key={faq.q}>
              <button
                type="button"
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="flex w-full items-center justify-between py-6 text-left outline-none"
              >
                <span className="pr-6 text-[15px] font-semibold text-slate-800">{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-slate-400 transition-transform duration-300 ${activeFaq === idx ? 'rotate-180' : ''}`}
                />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${activeFaq === idx ? 'max-h-48 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="text-[14px] font-medium leading-7 text-slate-500">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="sisca-reveal px-5 pb-24 md:px-6">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-800 bg-[linear-gradient(135deg,#0f172a_0%,#111827_48%,#1f2937_100%)] px-6 py-14 text-center text-white shadow-[0_28px_80px_-50px_rgba(15,23,42,0.75)] md:px-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Bot size={28} />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Coba tanyakan ke Sisca sekarang.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] font-medium leading-7 text-slate-300">
            Gunakan chat widget untuk simulasi layanan informasi akademik berbasis AI dan knowledge base.
          </p>
          <button
            type="button"
            onClick={handleOpenChannelOptions}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-[14px] font-semibold text-slate-900 transition-all hover:-translate-y-0.5 hover:bg-slate-100"
          >
            Buka Chat Widget <ArrowRight size={17} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white py-12">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 px-5 md:flex-row md:items-center md:px-6">
          <div>
            <a href="#beranda" className="mb-3 flex items-center gap-2">
              <SiscaLogo className="h-7 w-7 grayscale" />
              <span className="text-lg font-semibold text-slate-900">Sisca Platform</span>
            </a>
            <p className="max-w-md text-[13px] font-medium leading-6 text-slate-500">
              Student Information & Service Center Assistant untuk mendukung layanan informasi akademik Telkom University Surabaya.
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-[13px] font-medium text-slate-500">
            <a href="#fitur" className="hover:text-slate-900">Fitur</a>
            <a href="#integrasi" className="hover:text-slate-900">Integrasi</a>
            <a href="#cara-kerja" className="hover:text-slate-900">Cara Kerja</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </div>
        </div>
      </footer>

      {/* SCROLL TO TOP */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-24 right-5 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-slate-50 md:bottom-8 md:right-8"
          aria-label="Kembali ke atas"
        >
          <ArrowUp size={18} />
        </button>
      )}

      {/* FLOATING CHAT BUTTON */}
      {!isChatOpen && (
        <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-3 md:right-8">
          {showChannelOptions && (
            <div className="flex w-[230px] flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_22px_55px_-25px_rgba(15,23,42,0.35)]">
              <button
                type="button"
                onClick={handleOpenWebChat}
                className="flex w-full items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-left text-white transition-all hover:bg-slate-700"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold">Chat Web</p>
                  <p className="text-[11px] font-medium text-slate-300">Tanya langsung di website</p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsAppBot}
                disabled={!isWhatsAppBotAvailable || isCheckingWaStatus}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                  isWhatsAppBotAvailable
                    ? 'bg-[#E3000F] text-white hover:bg-[#C0000D]'
                    : 'cursor-not-allowed bg-slate-100 text-slate-400'
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    isWhatsAppBotAvailable ? 'bg-white/10' : 'bg-white'
                  }`}
                >
                  <Smartphone size={18} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold">WhatsApp Bot</p>
                  <p
                    className={`text-[11px] font-medium ${
                      isWhatsAppBotAvailable ? 'text-red-100' : 'text-slate-400'
                    }`}
                  >
                    {isCheckingWaStatus
                      ? 'Mengecek koneksi...'
                      : isWhatsAppBotAvailable
                        ? `Terhubung ke ${waBotNumber}`
                        : 'Bot belum terhubung'}
                  </p>
                </div>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleChannelOptions}
            className="flex items-center gap-3 rounded-full bg-[#E3000F] px-5 py-4 text-white shadow-[0_22px_55px_-20px_rgba(227,0,15,0.9)] transition-all hover:-translate-y-1 hover:bg-[#C0000D]"
            aria-label="Buka pilihan layanan Sisca"
          >
            <MessageSquare size={21} />
            <span className="hidden text-[13px] font-semibold sm:inline">Tanya Sisca</span>
          </button>
        </div>
      )}

      {/* CHAT WIDGET */}
      {isChatOpen && (
        <div className="fixed bottom-5 right-4 z-50 flex h-[680px] max-h-[calc(100vh-40px)] w-[calc(100vw-32px)] max-w-[420px] flex-col overflow-hidden rounded-[1.7rem] bg-white shadow-[0_25px_90px_-30px_rgba(15,23,42,0.45)] md:bottom-8 md:right-8">
          <div className="flex shrink-0 items-center justify-between bg-slate-900 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white">
                <SiscaLogo className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold leading-none">Sisca Assistant</h3>
                <p className="mt-1 text-[11px] font-medium text-slate-300">Student Service Center AI</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {chatStep === 'chatting' && (
                <button
                  type="button"
                  onClick={handleEndSession}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/20"
                >
                  <Power size={12} /> Selesai
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Tutup chat"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {chatStep === 'onboarding' && (
            <div className="flex flex-1 flex-col justify-center overflow-y-auto bg-white p-7">
              <div className="mb-7 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-[#E3000F]">
                  <Bot size={28} strokeWidth={1.6} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Selamat datang!</h3>
                <p className="mt-2 text-[13px] font-medium leading-6 text-slate-500">
                  Isi data singkat agar sesi chat, kontak, dan tiket laporan dapat tercatat dengan rapi.
                </p>
              </div>

              <form onSubmit={handleStartChat} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Nama Lengkap</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      required
                      value={userData.name}
                      onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-[14px] outline-none transition-all focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
                      placeholder="Contoh: Budi Santoso"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">NIM opsional</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={userData.nim}
                      onChange={(e) => setUserData({ ...userData, nim: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-[14px] outline-none transition-all focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
                      placeholder="Contoh: 1204xxxx"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Nomor WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="tel"
                      required
                      value={userData.waNumber}
                      onChange={(e) => setUserData({ ...userData, waNumber: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-[14px] outline-none transition-all focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
                      placeholder="Contoh: 081234567890"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isStartingChat}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E3000F] py-3.5 text-[14px] font-semibold text-white transition-all hover:bg-[#C0000D] disabled:bg-slate-300"
                >
                  {isStartingChat ? <Loader2 size={18} className="animate-spin" /> : 'Mulai Obrolan'}
                </button>
              </form>
            </div>
          )}

          {chatStep === 'chatting' && (
            <div className="flex min-h-0 flex-1 flex-col bg-[#F7F8FA]">
              {/* CHAT BODY */}
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                <div className="flex flex-col gap-4">
                  {chatHistory.map((chat, idx) => {
                    const isUser = chat.role === 'user';
                    const sources = normalizeSources(getMessageSources(chat));

                    return (
                      <div
                        key={`${chat.role}-${idx}`}
                        className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`flex max-w-[88%] items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'
                            }`}
                        >
                          {!isUser && (
                            <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                              <SiscaLogo className="h-3.5 w-3.5" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div
                              className={`rounded-[18px] px-4 py-3 text-[14px] font-medium leading-7 shadow-sm ${isUser
                                  ? 'rounded-br-md bg-slate-900 text-white'
                                  : 'rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200'
                                }`}
                            >
                              <div className="break-words">
                                {isUser ? chat.content : renderFormattedMessage(chat.content)}
                              </div>
                            </div>

                            {!isUser && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {sources.length > 0 && (
                                  <div className="group relative">
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200"
                                    >
                                      <FileSearch size={13} />
                                      Sumber
                                    </button>

                                    <div className="absolute bottom-full left-0 z-20 mb-2 w-72 translate-y-1 rounded-2xl bg-slate-900 p-3 text-[11px] font-medium leading-5 text-white opacity-0 shadow-xl transition-all group-hover:translate-y-0 group-hover:opacity-100">
                                      <div className="mb-2 flex items-center gap-1.5 font-semibold">
                                        <Info size={12} />
                                        Referensi dokumen
                                      </div>
                                      <div className="space-y-2 text-slate-200">
                                        {sources.map((source, sourceIdx) => (
                                          <div
                                            key={`${source.fileName}-${sourceIdx}`}
                                            className="rounded-xl bg-white/5 p-2"
                                          >
                                            <div className="break-words font-semibold text-white">
                                              {source.fileName}
                                            </div>

                                            {source.downloadUrl ? (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenDownloadConfirm(source);
                                                }}
                                                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-900 transition hover:bg-slate-100"
                                              >
                                                <Download size={12} />
                                                Unduh file
                                              </button>
                                            ) : (
                                              <p className="mt-1 text-[10px] font-medium text-slate-400">
                                                Link unduh belum tersedia.
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleCopyResponse(chat.content, idx)}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-800"
                                >
                                  {copiedMessageIndex === idx ? <Check size={13} /> : <Copy size={13} />}
                                  {copiedMessageIndex === idx ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                            )}

                            {!isUser && needsHumanAssistance(chat.content) && (
                              <button
                                type="button"
                                onClick={handleOpenTicketForm}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
                              >
                                <ClipboardList size={14} />
                                Buat Tiket Laporan
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isLoading && (
                    <div className="flex w-full justify-start">
                      <div className="flex max-w-[88%] items-end gap-2">
                        <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                          <SiscaLogo className="h-3.5 w-3.5" />
                        </div>

                        <div className="flex items-center gap-1.5 rounded-[18px] rounded-bl-md bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:120ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:240ms]" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* CHAT INPUT */}
              <div className="shrink-0 bg-white px-3 pb-3 pt-3 shadow-[0_-10px_30px_-24px_rgba(15,23,42,0.5)]">
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-end gap-2 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 transition-all focus-within:ring-slate-700"
                >
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Ketik pertanyaan akademik..."
                    className="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[14px] font-medium leading-6 text-slate-900 outline-none placeholder:text-slate-400"
                    rows={1}
                  />

                  <button
                    type="submit"
                    disabled={!message.trim() || isLoading}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E3000F] text-white transition-colors hover:bg-[#C0000D] disabled:bg-slate-100 disabled:text-slate-300"
                  >
                    <Send size={16} className="ml-0.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {chatStep === 'ticketing' && (
            <div className="flex flex-1 flex-col overflow-y-auto bg-white p-7">
              <button
                type="button"
                onClick={() => setChatStep('chatting')}
                className="mb-5 text-left text-[12px] font-semibold text-slate-400 hover:text-slate-700"
              >
                ← Kembali ke obrolan
              </button>

              <div className="mb-6">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-[#E3000F]">
                  <ClipboardList size={27} strokeWidth={1.6} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Buat Tiket Laporan</h3>
                <p className="mt-2 text-[13px] font-medium leading-6 text-slate-500">
                  Gunakan form ini jika jawaban Sisca belum menyelesaikan kendala Kakak.
                </p>
              </div>

              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Nama</label>
                  <input
                    type="text"
                    required
                    value={ticketForm.name}
                    onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">NIM</label>
                  <input
                    type="text"
                    value={ticketForm.nim}
                    onChange={(e) => setTicketForm({ ...ticketForm, nim: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
                    placeholder="Opsional"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">No. WhatsApp</label>
                  <input
                    type="tel"
                    required
                    value={ticketForm.waNumber}
                    onChange={(e) => setTicketForm({ ...ticketForm, waNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Deskripsi Kendala</label>
                  <textarea
                    required
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                    className="min-h-[110px] w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
                    placeholder="Tuliskan kendala atau pertanyaan yang belum terjawab..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E3000F] py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#C0000D] disabled:bg-slate-300"
                >
                  {isSubmittingTicket ? <Loader2 size={18} className="animate-spin" /> : 'Kirim Tiket Laporan'}
                </button>
              </form>
            </div>
          )}

          {chatStep === 'feedback' && (
            <div className="flex flex-1 flex-col justify-center bg-white p-8 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-4xl">
                {feedbackRating
                  ? feedbackMeta[feedbackRating as keyof typeof feedbackMeta].emoji
                  : '⭐'}
              </div>

              <h3 className="text-xl font-semibold text-slate-900">
                Bagaimana pengalaman Kakak?
              </h3>
              <p className="mt-2 text-[13px] font-medium leading-6 text-slate-500">
                Berikan rating dan pesan singkat agar staf dapat mengevaluasi kualitas layanan Sisca.
              </p>

              <div className="mb-3 mt-7 flex justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      size={36}
                      className={`${star <= (hoverRating || feedbackRating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200'
                        } transition-colors`}
                    />
                  </button>
                ))}
              </div>

              <p className="mb-6 min-h-5 text-[13px] font-semibold text-slate-500">
                {feedbackRating
                  ? feedbackMeta[feedbackRating as keyof typeof feedbackMeta].label
                  : 'Pilih rating layanan'}
              </p>

              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Tulis pesan feedback, misalnya: jawabannya jelas, cepat, atau perlu diperbaiki..."
                className="mb-5 min-h-[110px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-[13px] font-medium leading-6 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
              />

              <button
                type="button"
                onClick={handleSubmitFeedback}
                disabled={feedbackRating === 0}
                className="w-full rounded-xl bg-slate-900 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
              >
                Kirim Feedback
              </button>

              <button
                type="button"
                onClick={() => setChatStep('chatting')}
                className="mt-4 text-[13px] font-semibold text-slate-400 hover:text-slate-700"
              >
                Kembali ke obrolan
              </button>
            </div>
          )}
          {showEndConfirm && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-[2px]">
              <div className="w-full max-w-sm rounded-[1.5rem] bg-white p-6 shadow-[0_28px_90px_-40px_rgba(15,23,42,0.8)]">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#E3000F]">
                  <Power size={22} />
                </div>

                <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                  Akhiri sesi obrolan?
                </h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  Setelah sesi diakhiri, Kakak akan diarahkan untuk memberikan penilaian layanan Sisca.
                </p>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEndConfirm(false)}
                    className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEndConfirm(false);
                      setChatStep('feedback');
                    }}
                    className="rounded-xl bg-[#E3000F] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#C0000D]"
                  >
                    Ya, akhiri
                  </button>
                </div>
              </div>
            </div>
          )}

          {downloadConfirmSource && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-[2px]">
              <div className="w-full max-w-sm rounded-[1.5rem] bg-white p-6 shadow-[0_28px_90px_-40px_rgba(15,23,42,0.8)]">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#E3000F]">
                  <Download size={22} />
                </div>

                <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                  Unduh dokumen referensi?
                </h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  File berikut akan dibuka melalui tautan unduhan sementara dari Sisca.
                </p>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="break-words text-sm font-semibold text-slate-900">
                    {downloadConfirmSource.fileName}
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDownloadConfirmSource(null)}
                    className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDownload}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#E3000F] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#C0000D]"
                  >
                    <Download size={14} />
                    Unduh
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
