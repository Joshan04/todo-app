import { useState, useRef, useEffect } from 'react';
import { isToday, isYesterday } from 'date-fns';
import { useTaskStore } from '../store/useTaskStore';
import { useTheme } from '../hooks/useTheme';
import { Filter, SlidersHorizontal, MoreHorizontal, Plus, Check, Sun, Moon, Menu, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { TaskItem } from './TaskItem';

interface MainContentProps {
    onOpenMobileMenu: () => void;
}

export const MainContent: React.FC<MainContentProps> = ({ onOpenMobileMenu }) => {
    const {
        tasks,
        activeView,
        activeListId,
        activeTagId,
        setActiveView,
        lists,
        tags,
        addTask,
        getFilteredRootTaskIds,
        showCompleted,
        setShowCompleted,
        sortBy,
        setSortBy,
        collapseAll,
        expandAll,
        clearCompleted
    } = useTaskStore();
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const [openMenu, setOpenMenu] = useState<'filter' | 'sort' | 'more' | null>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const { theme, setTheme } = useTheme();

    const cycleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    };

    const getThemeIcon = () => {
        return theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />;
    };

    const handleClearCompleted = () => {
        setShowClearConfirm(true);
        setOpenMenu(null);
    };

    useEffect(() => {
        if (isAddingTask && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAddingTask]);

    // Click outside and Escape key to close menus
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as Element;
            // Close menus if clicked outside
            if (!target.closest('[data-menu-container]')) {
                setOpenMenu(null);
            }
            // Clear selected task if clicked outside any task item on mobile
            if (window.innerWidth < 768 && !target.closest('[data-task-item]')) {
                useTaskStore.getState().selectTask(null);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (openMenu !== null) {
                    setOpenMenu(null);
                    e.preventDefault();
                }
            }
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [openMenu]);

    // Auto-focus "Add a task" when switching contexts
    // But do NOT steal focus if user is editing a task (inputs inside task list)
    useEffect(() => {
        // Skip initial mount or if user is interacting with something else
        const activeEl = document.activeElement;
        const isEditingTask = activeEl?.closest('[data-task-id]'); // TaskItem inputs have this parent

        if (isEditingTask) return;

        // Ensure input is visible
        setIsAddingTask(true);
        // Focus will be handled by the existing useEffect dependent on [isAddingTask]
    }, [activeView, activeListId, activeTagId]);

    const getTitle = () => {
        if (activeListId) {
            const list = lists.find(l => l.id === activeListId);
            return list ? list.name : 'List';
        }
        if (activeTagId) {
            const tag = tags.find(t => t.id === activeTagId);
            return tag ? `#${tag.name} ` : 'Tag';
        }

        switch (activeView) {
            case 'all': return 'All Tasks';
            case 'today': return 'Today';
            case 'upcoming': return 'Upcoming';
            case 'completed': return 'Completed';
            default: return 'Tasks';
        }
    };

    const filteredTaskIds = getFilteredRootTaskIds();

    return (
        <main className="flex-1 h-screen flex flex-col bg-white overflow-hidden dark:bg-gray-950">
            {/* Header */}
            <header className="h-14 border-b border-gray-100 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-gray-950 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onOpenMobileMenu}
                        className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        aria-label="Open menu"
                    >
                        <Menu size={20} />
                    </button>
                    <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">{getTitle()}</h1>

                    {/* View Tabs - Desktop Only */}
                    <div className="hidden md:flex items-center gap-1 ml-2">
                        {(['all', 'today', 'upcoming'] as const).map(view => (
                            <button
                                key={view}
                                onClick={() => setActiveView(view)}
                                className={clsx(
                                    "px-2 py-1 text-xs rounded-md transition-colors",
                                    activeView === view && !activeListId && !activeTagId
                                        ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                                        : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                                )}
                            >
                                {view === 'all' ? 'All' : view.charAt(0).toUpperCase() + view.slice(1)}
                            </button>
                        ))}
                    </div>

                    {(activeListId || activeTagId) && (
                        <button
                            onClick={() => setActiveView('all')}
                            className="text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 px-2 py-0.5 rounded transition-colors dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            Clear filters
                        </button>
                    )}
                    <span className="text-sm text-gray-400">
                        {filteredTaskIds.length} {filteredTaskIds.length === 1 ? 'task' : 'tasks'} remaining
                    </span>
                </div>

                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    {/* Theme Toggle */}
                    <button
                        onClick={cycleTheme}
                        className="p-1.5 hover:bg-gray-100 rounded-md dark:hover:bg-gray-800"
                        title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} `}
                        aria-label="Toggle theme"
                    >
                        {getThemeIcon()}
                    </button>

                    {/* Filter Button */}
                    <div className="relative" data-menu-container>
                        <button
                            onClick={() => setOpenMenu(openMenu === 'filter' ? null : 'filter')}
                            className="p-1.5 hover:bg-gray-100 rounded-md flex items-center gap-1.5 text-sm font-medium border border-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
                            aria-haspopup="menu"
                            aria-expanded={openMenu === 'filter'}
                        >
                            <Filter size={16} />
                            <span>Filter</span>
                        </button>

                        {openMenu === 'filter' && (
                            <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-md shadow-lg py-1 w-48 z-10 dark:bg-gray-900 dark:border-gray-700" role="menu">
                                <button
                                    onClick={() => {
                                        setShowCompleted(!showCompleted);
                                        setOpenMenu(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 flex items-center gap-2 dark:text-gray-100 dark:hover:bg-gray-800"
                                    role="menuitem"
                                >
                                    <div className="w-4 h-4 border border-gray-300 rounded flex items-center justify-center dark:border-gray-600">
                                        {showCompleted && <Check size={12} />}
                                    </div>
                                    Show completed
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Sort Button */}
                    <div className="relative" data-menu-container>
                        <button
                            onClick={() => setOpenMenu(openMenu === 'sort' ? null : 'sort')}
                            className="p-1.5 hover:bg-gray-100 rounded-md dark:hover:bg-gray-800"
                            aria-haspopup="menu"
                            aria-expanded={openMenu === 'sort'}
                            aria-label="Sort options"
                        >
                            <SlidersHorizontal size={18} />
                        </button>

                        {openMenu === 'sort' && (
                            <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-md shadow-lg py-1 w-48 z-10 dark:bg-gray-900 dark:border-gray-700" role="menu">
                                <button
                                    onClick={() => { setSortBy('manual'); setOpenMenu(null); }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                                    role="menuitem"
                                >
                                    {sortBy === 'manual' && '✓ '}Manual order
                                </button>
                                <button
                                    onClick={() => { setSortBy('created'); setOpenMenu(null); }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                                    role="menuitem"
                                >
                                    {sortBy === 'created' && '✓ '}Created date
                                </button>
                                <button
                                    onClick={() => { setSortBy('dueDate'); setOpenMenu(null); }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                                    role="menuitem"
                                >
                                    {sortBy === 'dueDate' && '✓ '}Due date
                                </button>
                            </div>
                        )}
                    </div>

                    {/* More Menu */}
                    <div className="relative" data-menu-container>
                        <button
                            onClick={() => setOpenMenu(openMenu === 'more' ? null : 'more')}
                            className="p-1.5 hover:bg-gray-100 rounded-md dark:hover:bg-gray-800"
                            aria-haspopup="menu"
                            aria-expanded={openMenu === 'more'}
                            aria-label="More options"
                        >
                            <MoreHorizontal size={18} />
                        </button>

                        {openMenu === 'more' && (
                            <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-md shadow-lg py-1 w-48 z-10 dark:bg-gray-900 dark:border-gray-700" role="menu">
                                <button
                                    onClick={() => { collapseAll(); setOpenMenu(null); }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                                    role="menuitem"
                                >
                                    Collapse all
                                </button>
                                <button
                                    onClick={() => { expandAll(); setOpenMenu(null); }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                                    role="menuitem"
                                >
                                    Expand all
                                </button>
                                <div className="h-px bg-gray-200 my-1 dark:bg-gray-700" />
                                <button
                                    onClick={handleClearCompleted}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-red-600 dark:hover:bg-gray-800 dark:text-red-400"
                                    role="menuitem"
                                >
                                    Clear completed
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto">
                {/* Add Task Input - Directly Under Header */}
                <div className="max-w-4xl mx-auto w-full px-8 pt-6">
                    <div className="group/add">
                        {isAddingTask ? (
                            <div className="flex items-start py-1 px-2 -mx-2 rounded-md bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-center gap-1 mt-0.5 relative -left-1">
                                    {/* Spacer for alignment with tasks */}
                                    <div className="w-5 h-5" />
                                    {/* Empty checkbox placeholder */}
                                    <div className="w-5 h-5 rounded border border-gray-300 bg-white ml-1 dark:bg-gray-800 dark:border-gray-600" />
                                </div>
                                <input
                                    ref={inputRef}
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newTaskTitle.trim()) {
                                            addTask(newTaskTitle.trim());
                                            setNewTaskTitle('');
                                            // Keep input focused for quick entry
                                        } else if (e.key === 'Enter' && !newTaskTitle.trim() && filteredTaskIds.length === 0) {
                                            // Empty list: Enter creates first task
                                            addTask('');
                                            setNewTaskTitle('');
                                            setIsAddingTask(false);
                                            // Focus the new task
                                            setTimeout(() => {
                                                const firstTask = document.querySelector('[data-task-id]');
                                                const titleSpan = firstTask?.querySelector('.task-title') as HTMLElement;
                                                if (titleSpan) {
                                                    titleSpan.click();
                                                }
                                            }, 50);
                                        } else if (e.key === 'Escape') {
                                            setIsAddingTask(false);
                                            setNewTaskTitle('');
                                        }
                                    }}
                                    onBlur={() => {
                                        if (!newTaskTitle.trim()) {
                                            setIsAddingTask(false);
                                        }
                                    }}
                                    placeholder="Task name"
                                    className="flex-1 ml-2 bg-transparent outline-none text-gray-900 placeholder:text-gray-400 text-sm leading-[1.6] dark:text-gray-100"
                                />
                                {(!activeListId && !activeTagId && (activeView === 'today' || activeView === 'upcoming')) && (
                                    <div className="absolute left-0 -bottom-5 text-[10px] text-gray-400 pl-8 pointer-events-none w-max">
                                        Tasks without due dates won't appear here
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div
                                className="flex items-center gap-3 text-gray-400 cursor-text py-1 px-2 -mx-2 rounded-md hover:bg-gray-50 transition-colors dark:hover:bg-gray-800/50"
                                onClick={() => setIsAddingTask(true)}
                            >
                                <Plus size={20} />
                                <span className="text-sm">Add a task...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Task List */}
                <div className="px-8 max-w-4xl mx-auto w-full pt-4">
                    {/* Growth Tier: Daily Momentum & Greeting */}
                    {activeView === 'today' && filteredTaskIds.length > 0 && (
                        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                {(() => {
                                    const hour = new Date().getHours();
                                    if (hour < 5) return "Quiet hours.";
                                    if (hour < 12) return "Good morning.";
                                    if (hour < 18) return "Good afternoon.";
                                    return "Good evening.";
                                })()}
                                <span className="opacity-50 font-normal text-lg ml-1">
                                    {Object.values(tasks).filter(t => t.completed && t.completedAt && isToday(t.completedAt)).length > 0
                                        ? `You've completed ${Object.values(tasks).filter(t => t.completed && t.completedAt && isToday(t.completedAt)).length} tasks today.`
                                        : "Ready to pick things up?" /* Reduce Guilt */}
                                </span>
                            </h2>
                        </div>
                    )}

                    {/* Growth Tier: Celebration when Today is Clear */}
                    {activeView === 'today' && filteredTaskIds.length === 0 && Object.values(tasks).filter(t => t.dueDate && isToday(t.dueDate) && !t.completed).length === 0 && Object.values(tasks).filter(t => t.dueDate && isToday(t.dueDate) && t.completed).length > 0 && (
                        <div className="flex flex-col items-center justify-center text-center mt-10 mb-20 animate-in fade-in zoom-in-95 duration-700">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-full flex items-center justify-center mb-4 ring-1 ring-yellow-500/10 shadow-sm">
                                <span className="text-2xl">✨</span>
                            </div>
                            <h3 className="text-gray-900 dark:text-gray-100 font-medium text-lg mb-1">All done for today</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">Enjoy your evening.</p>
                            <button
                                onClick={() => setActiveView('upcoming')}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                                Want to plan tomorrow? &rarr;
                            </button>
                        </div>
                    )}


                    <ul className="space-y-1 pb-20 list-none">
                        {filteredTaskIds.length === 0 ? (
                            (!activeListId && !activeTagId && activeView === 'today' && Object.values(tasks).filter(t => t.dueDate && isToday(t.dueDate) && t.completed).length > 0) ? (
                                // Handled above by celebration
                                null
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center mt-20 select-none">
                                    {Object.keys(tasks).length === 0 ? (
                                        <>
                                            <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-black/5 dark:ring-white/5">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                            </div>
                                            <h3 className="text-gray-900 dark:text-gray-100 font-medium mb-1">Start small</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Write one thing you want to get done.</p>
                                        </>
                                    ) : (
                                        (!activeListId && !activeTagId && (activeView === 'today')) ? (
                                            <>
                                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-black/5 dark:ring-white/5">
                                                    <Sun size={20} className="text-gray-400" />
                                                </div>
                                                <h3 className="text-gray-900 dark:text-gray-100 font-medium mb-1">No tasks due today</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Add a due date to focus on today.</p>
                                            </>
                                        ) : activeView === 'upcoming' ? (
                                            <>
                                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-black/5 dark:ring-white/5">
                                                    <Calendar size={20} className="text-gray-400" />
                                                </div>
                                                <h3 className="text-gray-900 dark:text-gray-100 font-medium mb-1">No upcoming tasks</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">You're clear for the future.</p>
                                            </>
                                        ) : activeView === 'completed' ? (
                                            <>
                                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-black/5 dark:ring-white/5 ring-inset">
                                                    <Check size={20} className="text-gray-400" />
                                                </div>
                                                <h3 className="text-gray-900 dark:text-gray-100 font-medium mb-1">No completed tasks yet</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Finish tasks to build your history.</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-black/5 dark:ring-white/5">
                                                    <Filter size={20} className="text-gray-400" />
                                                </div>
                                                <h3 className="text-gray-900 dark:text-gray-100 font-medium mb-1">No tasks found</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters.</p>
                                            </>
                                        )
                                    )}
                                </div>
                            )
                        ) : (
                            filteredTaskIds.map(rootId => (
                                <TaskItem key={rootId} taskId={rootId} />
                            ))
                        )}
                    </ul>
                </div>
            </div>

            {/* Confirmation Dialog for Clear Completed */}
            {showClearConfirm && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center"
                    onClick={() => setShowClearConfirm(false)}
                >
                    <div
                        className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4 dark:bg-gray-900"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-labelledby="dialog-title"
                        aria-describedby="dialog-description"
                    >
                        <h2 id="dialog-title" className="text-lg font-semibold text-gray-900 mb-2 dark:text-gray-100">
                            Clear completed tasks?
                        </h2>
                        <p id="dialog-description" className="text-sm text-gray-600 mb-6 dark:text-gray-400">
                            This will permanently delete {Object.values(useTaskStore.getState().tasks).filter(t => t.completed).length} completed {Object.values(useTaskStore.getState().tasks).filter(t => t.completed).length === 1 ? 'task' : 'tasks'}. This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    clearCompleted();
                                    setShowClearConfirm(false);
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};
