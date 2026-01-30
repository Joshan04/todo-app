import { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { useTheme } from '../hooks/useTheme';
import { Filter, SlidersHorizontal, MoreHorizontal, Plus, Check, Sun, Moon, Monitor } from 'lucide-react';
import { TaskItem } from './TaskItem';

export const MainContent = () => {
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
        clearCompleted,
        searchQuery,
        setSearchQuery
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
            if (!target.closest('[data-menu-container]')) {
                setOpenMenu(null);
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
            return tag ? `#${tag.name}` : 'Tag';
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
            <header className="h-14 border-b border-gray-100 flex items-center justify-between px-8 bg-white dark:bg-gray-950 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">{getTitle()}</h1>
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
                        title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
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

            {/* Task List Container */}
            <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
                <ul className="space-y-1 pb-20 list-none">
                    {filteredTaskIds.length === 0 ? (
                        <div className="text-gray-400 text-center mt-20 dark:text-gray-500">
                            {Object.keys(tasks).length === 0 ? (
                                <>
                                    <p className="text-sm">No tasks yet.</p>
                                    <p className="text-xs mt-1">Press Enter or click "Add a task".</p>
                                </>
                            ) : (
                                (!activeListId && !activeTagId && (activeView === 'today' || activeView === 'upcoming')) ? (
                                    <>
                                        <p className="text-sm">No tasks with due dates here yet.</p>
                                        <p className="text-xs mt-1">Add a due date to see tasks in this view.</p>
                                    </>
                                ) : activeView === 'completed' ? (
                                    <p className="text-sm">No completed tasks yet.</p>
                                ) : (
                                    <>
                                        <p className="text-sm">No tasks match the current filters.</p>
                                        <p className="text-xs mt-1">Try switching lists, tags, or views.</p>
                                    </>
                                )
                            )}
                        </div>
                    ) : (
                        filteredTaskIds.map(rootId => (
                            <TaskItem key={rootId} taskId={rootId} />
                        ))
                    )}

                    {/* Inline Add Task Input - Notion Style */}
                    <div className="group/add mt-2">
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
                                        Tasks without due dates won’t appear here
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
                </ul>
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
