"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from "../../../lib/utils";
import {
    LayoutDashboard,
    Cpu,
    Layers,
    Settings,
    LogOut,
    Activity,
    Zap,
    Map
} from "lucide-react";

const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Dispositivos', icon: Cpu, href: '/dashboard/devices' },
    { name: 'Templates', icon: Layers, href: '/dashboard/templates' },
    { name: 'Automação', icon: Zap, href: '/dashboard/automation/rules' },
    { name: 'Cenários', icon: Map, href: '/dashboard/automation/scenarios' },
    { name: 'Configurações', icon: Settings, href: '/dashboard/settings' },
];

const NavbarVertical = () => {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-screen bg-[#0f1121] w-64 z-50 border-r border-slate-800/50 flex flex-col">
            <div className="h-20 flex items-center px-6 gap-3">
                <div className="flex items-center gap-1">
                    <span className="font-black text-white tracking-[2px] text-lg uppercase">DATANUMBERS</span>
                    <XIcon className="w-4 h-4 text-slate-500" />
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-8 px-4 space-y-3">
                {menuItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300 group relative",
                                isActive
                                    ? "bg-[#6d5dfc] text-white shadow-xl shadow-indigo-600/30"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <item.icon size={20} className={cn(
                                "shrink-0 transition-all",
                                isActive ? "text-white" : "text-slate-500 group-hover:text-[#6d5dfc]"
                            )} />
                            <span className="font-bold text-sm tracking-tight">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer Logout */}
            <div className="p-6">
                <button className="flex items-center gap-4 w-full px-5 py-4 text-slate-500 hover:bg-red-500/10 hover:text-red-400 rounded-2xl transition-all group font-bold text-sm">
                    <LogOut size={20} className="shrink-0" />
                    <span>Sair da conta</span>
                </button>
            </div>
        </aside>
    );
};

// Simple X icon helper to match logo
const XIcon = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
)

export default NavbarVertical;
