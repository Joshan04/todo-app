import React, { useState, useEffect, useRef } from 'react';
import { List } from 'lucide-react';
import clsx from 'clsx';
import { useTaskStore } from '../store/useTaskStore';

interface ListSelectorProps {
    taskId: string;
    isVisible?: boolean;
}

export const ListSelector: React.FC<ListSelectorProps> = ({ taskId, isVisible }) => {
    const { tasks, lists, updateTask } = useTaskStore();
    const task = tasks[taskId];
    const [showMenu, setShowMenu] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showMenu]);

    if (!task) return null;

    const currentList = lists.find(l => l.id === task.listId);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                }}
                className={clsx(
                    "flex items-center gap-1 text-gray-400 hover:text-gray-600 text-[11px] transition-opacity",
                    (isVisible || showMenu) ? "opacity-100" : "opacity-0 group-hover/item:opacity-100"
                )}
                aria-haspopup="menu"
                aria-expanded={showMenu}
                aria-label={`Change list, current: ${currentList?.name || 'Inbox'}`}
            >
                <List size={10} />
                <span>{currentList?.icon}</span>
            </button>

            {showMenu && (
                <div
                    className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg py-1 w-32 z-20 dark:bg-gray-800 dark:border-gray-700"
                    role="menu"
                >
                    {lists.map(list => (
                        <button
                            key={list.id}
                            onClick={() => {
                                updateTask(taskId, { listId: list.id });
                                setShowMenu(false);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 flex items-center gap-2 dark:hover:bg-gray-700 dark:text-gray-100"
                            role="menuitem"
                        >
                            <span>{list.icon}</span>
                            <span>{list.name}</span>
                            {task.listId === list.id && <span className="ml-auto text-blue-600">✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
