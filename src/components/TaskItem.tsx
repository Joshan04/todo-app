import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Check, Calendar, AlignLeft } from 'lucide-react';
import clsx from 'clsx';
import { useTaskStore } from '../store/useTaskStore';
import { DatePicker } from './DatePicker';
import { ListSelector } from './ListSelector';
import { TagSelector } from './TagSelector';
import { format, isToday, isTomorrow, isPast } from 'date-fns';


interface TaskItemProps {
    taskId: string;
    depth?: number;
}

export const TaskItem: React.FC<TaskItemProps> = ({ taskId, depth = 0 }) => {
    const {
        tasks,
        toggleTask,
        setExpanded,
        updateTask,
        tags: availableTags
    } = useTaskStore();

    const task = tasks[taskId];
    const [isEditing, setIsEditing] = useState(false);
    const [originalTitle, setOriginalTitle] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [showNotes, setShowNotes] = useState(false);
    const [noteDraft, setNoteDraft] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const notesRef = useRef<HTMLTextAreaElement>(null);

    // Initialize draft when opening notes
    useEffect(() => {
        if (showNotes) {
            setNoteDraft(task.notes || '');
            // Auto-focus next tick
            setTimeout(() => {
                if (notesRef.current) {
                    notesRef.current.focus();
                    // Cursor at end
                    notesRef.current.setSelectionRange(notesRef.current.value.length, notesRef.current.value.length);
                }
            }, 0);
        }
    }, [showNotes, task.notes]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    if (!task) return null;

    const handleToggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(taskId, !task.expanded);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setIsEditing(false);

            // Create sibling task at same hierarchy level
            const newTaskId = useTaskStore.getState().addSiblingTask(taskId, '');

            // Focus the new task after a brief delay
            setTimeout(() => {
                const newTaskElement = document.querySelector(`[data-task-id="${newTaskId}"]`);
                const titleSpan = newTaskElement?.querySelector('.task-title') as HTMLElement;
                if (titleSpan) {
                    titleSpan.click(); // Enter edit mode
                }
            }, 50);

        } else if (e.key === 'Escape') {
            e.preventDefault();
            // Restore original title and exit edit mode
            updateTask(taskId, { title: originalTitle });
            setIsEditing(false);

        } else if (e.key === 'Backspace' && task.title === '') {
            e.preventDefault();

            // Get visible tasks to find previous
            const visibleIds = useTaskStore.getState().getVisibleTaskIds();
            const currentIndex = visibleIds.indexOf(taskId);
            const prevTaskId = currentIndex > 0 ? visibleIds[currentIndex - 1] : null;

            // Delete current task
            useTaskStore.getState().deleteTask(taskId);

            // Focus previous task
            if (prevTaskId) {
                setTimeout(() => {
                    const prevElement = document.querySelector(`[data-task-id="${prevTaskId}"]`);
                    const titleSpan = prevElement?.querySelector('.task-title') as HTMLElement;
                    if (titleSpan) {
                        titleSpan.click(); // Enter edit mode
                    }
                }, 50);
            }

        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();

            const visibleIds = useTaskStore.getState().getVisibleTaskIds();
            const currentIndex = visibleIds.indexOf(taskId);

            let targetIndex = currentIndex;
            if (e.key === 'ArrowUp' && currentIndex > 0) {
                targetIndex = currentIndex - 1;
            } else if (e.key === 'ArrowDown' && currentIndex < visibleIds.length - 1) {
                targetIndex = currentIndex + 1;
            }

            const targetTaskId = visibleIds[targetIndex];
            if (targetTaskId && targetTaskId !== taskId) {
                setIsEditing(false);
                setTimeout(() => {
                    const targetElement = document.querySelector(`[data-task-id="${targetTaskId}"]`);
                    const titleSpan = targetElement?.querySelector('.task-title') as HTMLElement;
                    if (titleSpan) {
                        titleSpan.click(); // Enter edit mode
                    }
                }, 50);
            }

        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                useTaskStore.getState().outdentTask(taskId);
            } else {
                useTaskStore.getState().indentTask(taskId);
            }
        }
    };

    const formatDueDate = (timestamp: number) => {
        const date = new Date(timestamp);
        if (isToday(date)) return 'Today';
        if (isTomorrow(date)) return 'Tomorrow';
        return format(date, 'MMM d');
    };

    const hasSubtasks = task.subtasks && task.subtasks.length > 0;

    // Tag rendering helper
    const renderTags = () => {
        if (!task.tags || task.tags.length === 0) return null;
        return (
            <div className="flex items-center gap-1.5 ml-2">
                {task.tags.map(tagId => {
                    const tag = availableTags.find(t => t.id === tagId);
                    if (!tag) return null;
                    return (
                        <span key={tagId} className={clsx("text-[10px] px-1.5 py-0.5 rounded", tag.color)}>
                            #{tag.name}
                        </span>
                    );
                })}
            </div>
        );
    };

    return (
        <li
            className="group/item list-none"
            role="listitem"
            aria-labelledby={`task-title-${taskId}`}
        >
            {/* Task Row */}
            <div
                data-task-id={taskId}
                className={clsx(
                    "flex items-start py-1 px-2 -mx-2 rounded-md hover:bg-gray-100 group-hover/item:bg-gray-100 transition-colors dark:hover:bg-gray-800 dark:group-hover/item:bg-gray-800",
                    depth > 0 && "ml-4",
                    isFocused && "ring-2 ring-blue-500 ring-opacity-50"
                )}
                style={{ paddingLeft: `${depth * 24 + 8}px` }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                tabIndex={0}
            >
                {/* Controls: Drag + Expand + Check */}
                <div className="flex items-center gap-1 mt-0.5 relative -left-1">
                    {/* Expand Toggle */}
                    <button
                        onClick={handleToggleExpand}
                        className={clsx(
                            "p-0.5 rounded hover:bg-gray-200 text-gray-400 transition-colors w-5 h-5 flex items-center justify-center dark:hover:bg-gray-700",
                            (!hasSubtasks) && "opacity-0 group-hover/item:opacity-100"
                        )}
                        aria-label={hasSubtasks ? (task.expanded ? "Collapse subtasks" : "Expand subtasks") : "No subtasks"}
                        aria-expanded={hasSubtasks ? task.expanded : undefined}
                        disabled={!hasSubtasks}
                    >
                        {task.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {/* Checkbox */}
                    <button
                        onClick={() => toggleTask(taskId)}
                        className={clsx(
                            "w-5 h-5 rounded border border-gray-300 flex items-center justify-center transition-colors ml-1 dark:border-gray-600",
                            task.completed ? "bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-black" : "hover:border-gray-400 bg-white dark:bg-gray-800 dark:hover:border-gray-500"
                        )}
                        role="checkbox"
                        aria-checked={task.completed}
                        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                    >
                        {task.completed && <Check size={12} strokeWidth={3} />}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 ml-2 min-w-0">
                    <div className="flex items-center">
                        {isEditing ? (
                            <input
                                ref={inputRef}
                                value={task.title}
                                onChange={(e) => updateTask(taskId, { title: e.target.value })}
                                onBlur={() => setIsEditing(false)}
                                onKeyDown={handleKeyDown}
                                className="bg-transparent w-full outline-none border-b border-blue-500 pb-0.5 text-gray-900 dark:text-gray-100"
                            />
                        ) : (
                            <span
                                id={`task-title-${taskId}`}
                                onClick={() => {
                                    setOriginalTitle(task.title);
                                    setIsEditing(true);
                                }}
                                className={clsx(
                                    "task-title cursor-text select-none text-gray-900 dark:text-gray-100",
                                    task.completed && "text-gray-400 line-through dark:text-gray-500"
                                )}
                            >
                                {task.title}
                            </span>
                        )}
                    </div>

                    {/* Metadata Row (Tags, Due Date, Subtask count) */}
                    <div className={clsx("flex items-center gap-3 mt-1 text-xs text-gray-400 h-5", (task.tags.length === 0 && !task.dueDate && !hasSubtasks && !task.notes) && "hidden group-hover/item:flex")}>
                        {/* Subtask progress */}
                        {hasSubtasks && (
                            <span
                                className=""
                                aria-label={`${task.subtasks.filter(sid => tasks[sid]?.completed).length} of ${task.subtasks.length} subtasks completed`}
                            >
                                {task.subtasks.filter(sid => tasks[sid]?.completed).length}/{task.subtasks.length} subtasks
                            </span>
                        )}

                        <ListSelector taskId={taskId} />

                        <TagSelector taskId={taskId} />

                        {renderTags()}

                        {task.dueDate ? (
                            <div className="relative">
                                <button
                                    onClick={() => setShowDatePicker(!showDatePicker)}
                                    className={clsx(
                                        "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium",
                                        isPast(task.dueDate) && !isToday(task.dueDate)
                                            ? "text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
                                            : "text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-200 dark:hover:bg-orange-900/50"
                                    )}
                                >
                                    <Calendar size={10} />
                                    <span>{formatDueDate(task.dueDate)}</span>
                                </button>
                                {showDatePicker && (
                                    <DatePicker
                                        currentDate={task.dueDate}
                                        onSelect={(date) => {
                                            updateTask(taskId, { dueDate: date });
                                            setShowDatePicker(false);
                                        }}
                                        onClose={() => setShowDatePicker(false)}
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="relative opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <button
                                    onClick={() => setShowDatePicker(true)}
                                    className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-[11px] dark:hover:text-gray-300"
                                >
                                    <Calendar size={10} />
                                    <span>Add date</span>
                                </button>
                                {showDatePicker && (
                                    <DatePicker
                                        currentDate={null}
                                        onSelect={(date) => {
                                            updateTask(taskId, { dueDate: date });
                                            setShowDatePicker(false);
                                        }}
                                        onClose={() => setShowDatePicker(false)}
                                    />
                                )}
                            </div>
                        )}
                        {/* Notes Toggle */}
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowNotes(!showNotes);
                                }}
                                className={clsx(
                                    "flex items-center gap-1 rounded text-[11px] hover:text-gray-600 dark:hover:text-gray-300 transition-colors",
                                    task.notes ? "text-gray-500 dark:text-gray-400" : "text-gray-400 opacity-0 group-hover/item:opacity-100"
                                )}
                                aria-label={task.notes ? "Edit notes" : "Add notes"}
                            >
                                <AlignLeft size={10} />
                                {(!task.notes && !showNotes) && <span>Add note</span>}
                            </button>
                        </div>
                    </div>

                    {/* Notes Field */}
                    {showNotes && (
                        <div className="mt-1.5 ml-0.5">
                            <textarea
                                ref={notesRef}
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                onClick={(e) => e.stopPropagation()} // Prevent row selection
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        e.stopPropagation();
                                        setShowNotes(false);
                                        // Reset to original on cancel? Req says "collapses notes without saving"
                                        setNoteDraft(task.notes || '');
                                    }
                                    // Allow Enter for newlines
                                }}
                                onBlur={() => {
                                    // Save and collapse
                                    updateTask(taskId, { notes: noteDraft.trim() || undefined });
                                    setShowNotes(false);
                                }}
                                placeholder="Type notes..."
                                className="w-full bg-transparent text-xs text-gray-600 leading-relaxed resize-none outline-none border-none placeholder:text-gray-400 dark:text-gray-300 dark:placeholder:text-gray-600 block rounded"
                                style={{
                                    fieldSizing: "content", // Modern CSS for auto-grow
                                    minHeight: "2lh"
                                } as React.CSSProperties}
                                rows={Math.max(2, noteDraft.split('\n').length)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Recursive Children */}
            {task.expanded && hasSubtasks && (
                <div className="">
                    {task.subtasks.map(childId => {
                        // Apply search filtering to children
                        // Use a selector/memoized approach would be better but direct access is fine for now
                        const searchQuery = useTaskStore.getState().searchQuery.toLowerCase();
                        if (searchQuery) {
                            // Helper to check match
                            const hasMatch = (tId: string): boolean => {
                                const t = useTaskStore.getState().tasks[tId];
                                if (!t) return false;
                                if (t.title.toLowerCase().includes(searchQuery)) return true;
                                return t.subtasks.some(cid => hasMatch(cid));
                            };

                            if (!hasMatch(childId)) return null;
                        }

                        return <TaskItem key={childId} taskId={childId} depth={depth + 1} />;
                    })}
                </div>
            )}
        </li>
    );
};
