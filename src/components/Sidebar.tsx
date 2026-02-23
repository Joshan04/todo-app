import { useState, useEffect } from 'react';
import {
    Inbox,
    Calendar,
    CalendarDays,
    Hash,
    Settings,
    Search,
    Plus,
    Layout,
    CheckCircle,
    X,
    LogIn
} from 'lucide-react';
import clsx from 'clsx';
import { useTaskStore } from '../store/useTaskStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../hooks/useTheme';
import { AuthModal } from './AuthModal';
import type { ViewType } from '../types';

interface SidebarProps {
    isMobileOpen: boolean;
    onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onClose }) => {
    const { activeView, setActiveView, activeListId, setActiveList, activeTagId, setActiveTag, lists, tags, tasks, searchQuery, setSearchQuery } = useTaskStore();
    const [showSettings, setShowSettings] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const { theme, setTheme } = useTheme();
    const { user, logout } = useAuthStore();

    // Close on Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showSettings) {
                    setShowSettings(false);
                } else if (isMobileOpen) {
                    onClose();
                }
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [showSettings, isMobileOpen, onClose]);

    const handleNavigation = (action: () => void) => {
        action();
        if (window.innerWidth <= 768) {
            onClose();
        }
    };

    const navItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
        { id: 'all', label: 'All Tasks', icon: <Inbox size={18} /> },
        { id: 'today', label: 'Today', icon: <Calendar size={18} /> },
        { id: 'upcoming', label: 'Upcoming', icon: <CalendarDays size={18} /> },
        { id: 'completed', label: 'Completed', icon: <CheckCircle size={18} /> },
    ];

    // Simple counts
    const getCount = (view: ViewType) => {
        const allTasks = Object.values(tasks);
        switch (view) {
            case 'all': return allTasks.filter(t => !t.completed).length;
            case 'today': {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const todayEnd = new Date();
                todayEnd.setHours(23, 59, 59, 999);
                return allTasks.filter(t => !t.completed && t.dueDate && t.dueDate >= todayStart.getTime() && t.dueDate <= todayEnd.getTime()).length;
            }
            case 'upcoming': {
                const todayEnd = new Date();
                todayEnd.setHours(23, 59, 59, 999);
                return allTasks.filter(t => !t.completed && t.dueDate && t.dueDate > todayEnd.getTime()).length;
            }
            case 'completed': return allTasks.filter(t => t.completed).length;
            default: return 0;
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            <aside className={clsx(
                "w-64 bg-white/60 border-r border-gray-200/50 h-[100dvh] flex flex-col dark:bg-neutral-900/60 dark:border-white/5 backdrop-blur-xl supports-[backdrop-filter]:bg-opacity-80 transition-colors duration-300",
                "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-out md:translate-x-0 md:static",
                isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full bg-transparent">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3.5 mt-1">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                                <Layout className="text-white" size={16} strokeWidth={2.5} />
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Taskflow</span>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="px-3 py-2">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-black/[0.04] rounded-lg dark:bg-white/[0.06] ring-1 ring-transparent focus-within:ring-black/5 dark:focus-within:ring-white/10 transition-all duration-200">
                            <Search size={14} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-500 dark:text-gray-100 dark:placeholder:text-gray-500 font-medium"
                            />
                            <div className="flex items-center gap-1">
                                <kbd className="text-[10px] text-gray-400 bg-white/50 px-1.5 py-0.5 rounded border border-gray-200 dark:bg-gray-700/50 dark:border-gray-700 dark:text-gray-400 font-sans tracking-wide">⌘K</kbd>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Navigation Content */}
                    <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-6 min-h-0 scrollbar-hide">
                        {/* Main Views */}
                        <div className="space-y-0.5">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavigation(() => setActiveView(item.id))}
                                    className={clsx(
                                        "w-full flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 group relative active:scale-[0.98]",
                                        activeView === item.id && activeListId === null && activeTagId === null
                                            ? "bg-black/[0.07] text-gray-900 dark:bg-white/[0.1] dark:text-gray-100"
                                            : "text-gray-600 hover:bg-black/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.06]"
                                    )}
                                >
                                    <span className={clsx(
                                        "shrink-0 transition-colors",
                                        activeView === item.id && activeListId === null && activeTagId === null
                                            ? "text-gray-900 dark:text-gray-100"
                                            : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                                    )}>
                                        {item.icon}
                                    </span>
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {getCount(item.id) > 0 && (
                                        <span className="text-xs text-gray-400 font-medium">{getCount(item.id)}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Lists/Projects */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between px-3 mb-1.5 group">
                                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Lists</span>
                                <Plus
                                    size={12}
                                    strokeWidth={3}
                                    className="cursor-pointer text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 opacity-100 flex items-center justify-center transition-opacity active:scale-90"
                                    onClick={() => {
                                        const name = prompt('Enter new list name:');
                                        if (name && name.trim()) {
                                            useTaskStore.getState().addList(name.trim());
                                        }
                                    }}
                                />
                            </div>
                            <div className="space-y-0.5">
                                {lists.map(list => (
                                    <button
                                        key={list.id}
                                        onClick={() => handleNavigation(() => setActiveList(list.id))}
                                        className={clsx(
                                            "w-full flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 active:scale-[0.98]",
                                            activeListId === list.id
                                                ? "bg-black/[0.07] text-gray-900 dark:bg-white/[0.1] dark:text-gray-100"
                                                : "text-gray-600 hover:bg-black/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.06]"
                                        )}
                                        aria-current={activeListId === list.id ? 'page' : undefined}
                                    >
                                        <span className="text-lg leading-none">{list.icon}</span>
                                        <span className="truncate">{list.name}</span>
                                    </button>
                                ))}
                                {lists.length === 0 && (
                                    <p className="px-3 py-1 text-xs text-gray-400 italic">No lists yet</p>
                                )}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <div className="flex items-center justify-between px-3 mb-1.5 group">
                                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tags</span>
                                <Plus
                                    size={12}
                                    strokeWidth={3}
                                    className="cursor-pointer text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 opacity-100 flex items-center justify-center transition-opacity active:scale-90"
                                    onClick={() => {
                                        const name = prompt('Enter new tag name:');
                                        if (name && name.trim()) {
                                            useTaskStore.getState().addTag(name.trim());
                                        }
                                    }}
                                />
                            </div>
                            <div className="space-y-0.5">
                                {tags.map(tag => (
                                    <button
                                        key={tag.id}
                                        onClick={() => handleNavigation(() => setActiveTag(tag.id))}
                                        className={clsx(
                                            "w-full flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 active:scale-[0.98]",
                                            activeTagId === tag.id
                                                ? "bg-black/[0.07] text-gray-900 dark:bg-white/[0.1] dark:text-gray-100"
                                                : "text-gray-600 hover:bg-black/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.06]"
                                        )}
                                        aria-current={activeTagId === tag.id ? 'page' : undefined}
                                    >
                                        <Hash size={14} className={clsx("shrink-0", activeTagId === tag.id ? "text-gray-600 dark:text-gray-400" : "text-gray-400")} />
                                        <span className="truncate">{tag.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </nav>

                    {/* Settings & Auth Button - Fixed at Bottom */}
                    <div className="p-3 border-t border-gray-100 dark:border-white/5 bg-white/40 dark:bg-neutral-900/40 space-y-1 backdrop-blur-md">
                        {user ? (
                            <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors group cursor-pointer active:scale-[0.98]">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="User" className="w-5 h-5 rounded-full ring-1 ring-black/10 dark:ring-white/10" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold ring-1 ring-black/5">
                                            {user.email?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[100px]">{user.displayName || user.email?.split('@')[0]}</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        logout();
                                    }}
                                    className="text-[10px] font-medium text-gray-400 group-hover:text-red-500 hover:underline opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    Sign out
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAuthModal(true)}
                                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 transition-all font-medium border border-blue-100 dark:border-blue-900/20 active:scale-[0.98]"
                            >
                                <LogIn size={14} />
                                <span>Sign In</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowSettings(true)}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm rounded-lg text-gray-600 font-medium hover:bg-black/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.06] transition-all active:scale-[0.98]"
                        >
                            <Settings size={14} />
                            <span>Settings</span>
                        </button>
                    </div>
                </div>

                {/* Settings Modal */}
                {showSettings && (
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setShowSettings(false)}
                    >
                        <div
                            className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden dark:bg-gray-900 dark:border dark:border-gray-800 ring-1 ring-black/5 animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Settings</h2>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors dark:hover:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="p-4">
                                <div className="mb-6">
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Appearance</label>
                                    <div className="grid grid-cols-2 gap-2 p-1 bg-black/[0.04] rounded-lg dark:bg-white/[0.06] border-0">
                                        {(['light', 'dark'] as const).map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setTheme(t)}
                                                className={clsx(
                                                    "px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all",
                                                    theme === t
                                                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100 ring-1 ring-black/5"
                                                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                                                )}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-center pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <p className="text-[10px] uppercase tracking-widest text-gray-300 dark:text-gray-700 font-semibold">Taskflow v1.0.0</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
            </aside>
        </>
    );
};
