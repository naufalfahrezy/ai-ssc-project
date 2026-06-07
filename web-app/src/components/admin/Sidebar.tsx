'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import SiscaLogo from '@/components/SiscaLogo';
import {
    LayoutDashboard,
    Database,
    MessageSquare,
    Users,
    Ticket,
    Smartphone,
    Settings,
    Activity,
    LogOut,
    PhoneCall,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type SidebarItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
    disabled?: boolean;
};

type SidebarSection = {
    label: string;
    items: SidebarItem[];
};

const menuSections: SidebarSection[] = [
    {
        label: 'Main',
        items: [
            {
                title: 'Overview',
                href: '/admin',
                icon: LayoutDashboard,
            },
        ],
    },
    {
        label: 'AI Management',
        items: [
            {
                title: 'Knowledge Base',
                href: '/admin/knowledge',
                icon: Database,
            },
            {
                title: 'Chat History',
                href: '/admin/chat-history',
                icon: MessageSquare,
            },
            {
                title: 'Bot Settings',
                href: '/admin/bot-settings',
                icon: Settings,
            },
        ],
    },
    {
        label: 'Service Center',
        items: [
            {
                title: 'Contacts',
                href: '/admin/contacts',
                icon: Users,
            },
            {
                title: 'Tickets',
                href: '/admin/tickets',
                icon: Ticket,
            },
        ],
    },
    {
        label: 'Integration',
        items: [
            {
                title: 'WhatsApp Integration',
                href: '/admin/whatsapp-integration',
                icon: Smartphone,
                badge: 'New',
            },
            {
                title: 'System Status',
                href: '/admin/system-status',
                icon: Activity,
            },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white">
            <div className="flex h-20 items-center gap-3 px-7">
                <SiscaLogo className="h-9 w-9" />
                <div>
                    <h1 className="text-[18px] font-semibold tracking-tight text-slate-950">
                        Sisca
                    </h1>
                    <p className="text-[11px] font-medium text-slate-400">
                        Admin Workspace
                    </p>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 pb-6">
                {menuSections.map((section) => (
                    <div key={section.label} className="mb-6">
                        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {section.label}
                        </p>

                        <div className="space-y-1">
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                const isActive =
                                    pathname === item.href ||
                                    (item.href !== '/admin' && pathname.startsWith(item.href));

                                const linkClassName = [
                                    'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all',
                                    item.disabled
                                        ? 'cursor-not-allowed text-slate-300'
                                        : isActive
                                            ? 'bg-slate-100 text-slate-950'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                                ].join(' ');

                                const content = (
                                    <>
                                        <span className="flex min-w-0 items-center gap-3">
                                            <Icon size={17} strokeWidth={1.9} />
                                            <span className="truncate">{item.title}</span>
                                        </span>

                                        {item.badge && (
                                            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                                {item.badge}
                                            </span>
                                        )}
                                    </>
                                );

                                if (item.disabled) {
                                    return (
                                        <div key={item.title} className={linkClassName}>
                                            {content}
                                        </div>
                                    );
                                }

                                return (
                                    <Link key={item.title} href={item.href} className={linkClassName}>
                                        {content}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="border-t border-slate-100 p-4">
                <div className="mb-3 rounded-2xl bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-slate-800">
                        <PhoneCall size={15} className="text-[#E3000F]" />
                        SSC Operational
                    </div>
                    <p className="text-[12px] font-medium leading-5 text-slate-500">
                        Monday - Friday, 08.00 - 16.00 WIB
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-medium text-[#E3000F] transition-colors hover:bg-red-50"
                >
                    <LogOut size={16} />
                    Log Out
                </button>
            </div>
        </aside>
    );
}