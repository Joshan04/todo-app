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
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            <aside className={clsx(
                "w-64 bg-gray-50 border-r border-gray-200 h-[100dvh] flex flex-col dark:bg-gray-900 dark:border-gray-800",
                "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out md:translate-x-0 md:static",
                isMobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full bg-white dark:bg-gray-950">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Layout className="text-white" size={20} />
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">Taskflow</span>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md dark:bg-gray-900">
                            <Search size={16} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-500 dark:text-gray-100 dark:placeholder:text-gray-500"
                            />
                            <div className="flex items-center gap-1">
                                <kbd className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300">⌘ K</kbd>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Navigation Content */}
                    <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6 min-h-0">
                        {/* Main Views */}
                        <div className="space-y-0.5">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavigation(() => setActiveView(item.id))}
                                    className={clsx(
                                        "w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
                                        activeView === item.id && activeListId === null && activeTagId === null
                                            ? "bg-gray-200 text-gray-900 font-medium dark:bg-gray-800 dark:text-gray-100"
                                            : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                    )}
                                >
                                    {item.icon}
                                    <span className="flex-1 text-left">{item.label}</span>
                                    <span className="text-xs text-gray-400">{getCount(item.id)}</span>
                                </button>
                            ))}
                        </div>

                        {/* Lists/Projects */}
                        <div className="pt-4">
                            <div className="flex items-center justify-between px-3 mb-1 text-xs font-semibold text-gray-400">
                                <span>LISTS</span>
                                <Plus
                                    size={14}
                                    className="cursor-pointer hover:text-gray-600"
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
                                            "w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
                                            activeListId === list.id
                                                ? "bg-gray-200 text-gray-900 font-medium dark:bg-gray-800 dark:text-gray-100"
                                                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                        )}
                                        aria-current={activeListId === list.id ? 'page' : undefined}
                                    >
                                        <span>{list.icon}</span>
                                        <span>{list.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <div className="flex items-center justify-between px-3 mb-1 text-xs font-semibold text-gray-400">
                                <span>TAGS</span>
                                <Plus
                                    size={14}
                                    className="cursor-pointer hover:text-gray-600 dark:hover:text-gray-300"
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
                                            "w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
                                            activeTagId === tag.id
                                                ? "bg-gray-200 text-gray-900 font-medium dark:bg-gray-800 dark:text-gray-100"
                                                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                        )}
                                        aria-current={activeTagId === tag.id ? 'page' : undefined}
                                    >
                                        <Hash size={16} />
                                        <span>{tag.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </nav>

                    {/* Settings & Auth Button - Fixed at Bottom */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 space-y-2">
                        {user ? (
                            <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="User" className="w-6 h-6 rounded-full" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                                            {user.email?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="truncate max-w-[100px]">{user.displayName || user.email?.split('@')[0]}</span>
                                </div>
                                <button
                                    onClick={() => logout()}
                                    className="text-xs text-red-500 hover:text-red-700 hover:underline"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAuthModal(true)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 transition-colors"
                            >
                                <LogIn size={18} />
                                <span>Sign In</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowSettings(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        >
                            <Settings size={18} />
                            <span>Settings</span>
                        </button>
                    </div>
                </div>

                {/* Settings Modal */}
                {showSettings && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowSettings(false)}
                    >
                        <div
                            className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden dark:bg-gray-900 dark:border dark:border-gray-800"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors dark:hover:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-4">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Theme</label>
                                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg dark:bg-gray-800">
                                        {(['light', 'dark'] as const).map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setTheme(t)}
                                                className={clsx(
                                                    "px-3 py-1.5 text-sm rounded-md capitalize transition-all",
                                                    theme === t
                                                        ? "bg-white text-gray-900 shadow-sm font-medium dark:bg-gray-700 dark:text-gray-100"
                                                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                                                )}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-center pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <p className="text-xs text-gray-400">Taskflow v1.0.0</p>
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
