import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from "react-dom";
import { ChevronRight, ChevronDown, Check, Calendar, AlignLeft, Plus, Trash2, MoreVertical, Hash, List, Clock } from 'lucide-react';
import clsx from 'clsx';
import { useTaskStore } from '../store/useTaskStore';
import { DatePicker } from './DatePicker';
import { ListSelector } from './ListSelector';
import { TagSelector } from './TagSelector';
import ConfirmModal from './ConfirmModal';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import type { Task } from '../types';
import {
    scheduleReminder,
    cancelReminder,
    requestNotificationPermission,
} from "../lib/reminderManager";


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
        deleteTask,
        addTask,
        tags: availableTags,
        selectedTaskId,
        selectTask,
        updateTaskTitle,
        editingTaskId,
        setEditingTask,
        autoEditTaskId,
        setAutoEditTask
    } = useTaskStore();

    const rawTask = tasks[taskId];
    // Safe fallback for hooks to prevent crash if task is undefined
    const task = rawTask ?? {
        id: taskId,
        title: '',
        completed: false,
        expanded: false,
        tags: [],
        subtasks: [],
        listId: '',
        notes: '',
        dueDate: null
    } as Task;

    const [isFocused, setIsFocused] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const [showNotes, setShowNotes] = useState(false);
    const [noteDraft, setNoteDraft] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const notesRef = useRef<HTMLTextAreaElement>(null);
    const dateTriggerRef = useRef<HTMLButtonElement | HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const datePickerRef = useRef<HTMLDivElement>(null);
    const [lockedPosition, setLockedPosition] = useState<{ top: number; left: number } | null>(null);


    useLayoutEffect(() => {
        if (showDatePicker && !lockedPosition) {
            // Use menu button as fallback when there's no due date
            const triggerElement = dateTriggerRef.current || menuButtonRef.current;
            if (!triggerElement) return;

            const rect = triggerElement.getBoundingClientRect();

            let left = rect.left;
            const width = 256; // w-64 = 16rem = 256px
            const padding = 8;

            // Mobile or Touch devices (iOS/Android)
            const isMobile = window.innerWidth < 768 || window.matchMedia('(hover: none)').matches;

            if (isMobile) {
                // Center on mobile
                left = (window.innerWidth - width) / 2;
            } else {
                // Desktop behavior: stick to trigger but keep within bounds
                if (left + width > window.innerWidth) {
                    left = window.innerWidth - width - padding;
                }
                if (left < padding) {
                    left = padding;
                }
            }

            setLockedPosition({
                top: rect.bottom + 8,
                left,
            });
        }


        // Clear locked position when picker closes
        if (!showDatePicker) {
            setLockedPosition(null);
        }
    }, [showDatePicker, lockedPosition]);

    const isSelected = selectedTaskId === taskId;
    const isEditing = editingTaskId === taskId;

    // Initialize draft when opening notes
    useEffect(() => {
        if (showNotes) {
            setNoteDraft(task.notes ?? '');
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

    const [menuOpen, setMenuOpen] = useState(false);
    useEffect(() => {
        const close = () => setMenuOpen(false);
        if (menuOpen) window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, [menuOpen]);

    // Auto-edit newly created subtasks
    useEffect(() => {
        if (autoEditTaskId === taskId) {
            setEditingTask(taskId);
            // Clear the auto-edit flag after a short delay
            setTimeout(() => {
                setAutoEditTask(null);
            }, 100);
        }
    }, [autoEditTaskId, taskId, setEditingTask, setAutoEditTask]);

    // Helper to calculate exact due time
    const getDueAt = (t: Task): number => {
        if (!t.dueDate) return 0;
        const date = new Date(t.dueDate);
        if (t.dueTime) {
            const [hours, minutes] = t.dueTime.split(':').map(Number);
            date.setHours(hours, minutes, 0, 0);
        } else {
            // Default to 09:00 local time
            date.setHours(9, 0, 0, 0);
        }
        return date.getTime();
    };

    // Reminders Hook
    useEffect(() => {
        if (!task.dueDate || task.completed) {
            cancelReminder(task.id);
            return;
        }

        const dueAt = getDueAt(task);
        if (dueAt > Date.now()) {
            requestNotificationPermission();
            scheduleReminder(task.id, task.title, dueAt);
        } else {
            // If time passed, ensure no pending reminder
            cancelReminder(task.id);
        }

        return () => cancelReminder(task.id);
    }, [task.dueDate, task.dueTime, task.completed, task.title, task.id]);

    if (!rawTask) {
        // console.warn("[Armor] task not found in store, skipping render", taskId);
        return null;
    }

    const handleToggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(taskId, !task.expanded);
    };

    const handleRowClick = () => {
        // Allow selection on mobile OR touch devices (tablets)
        const isTouch = window.matchMedia('(hover: none)').matches;
        if (window.innerWidth < 768 || isTouch) {
            // If editing title, don't toggle selection
            if (isEditing) return;

            // Toggle selection
            if (isSelected) {
                selectTask(null);
            } else {
                selectTask(taskId);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setEditingTask(null);

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
            setEditingTask(null);

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
                setEditingTask(null);
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

    const hasSubtasks = (task.subtasks?.length ?? 0) > 0;

    // Tag rendering helper
    const renderTags = () => {
        if (!task.tags || task.tags.length === 0) return null;
        return (
            <div className="flex items-center gap-1.5 ml-2">
                {(task.tags ?? []).map(tagId => {
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
                data-task-item="true"
                onClick={handleRowClick}
                className={clsx(
                    "flex items-start py-2 px-3 -mx-3 rounded-lg transition-all duration-200 ease-out",
                    // Phase 3 & 4: bg-transparent default, subtle hover, stronger select
                    "hover:bg-black/[0.025] dark:hover:bg-white/[0.035]",
                    "group-hover/item:bg-black/[0.01] dark:group-hover/item:bg-white/[0.01]",
                    isFocused && "ring-2 ring-blue-500/50",
                    isSelected && "bg-black/[0.05] dark:bg-white/[0.08]",
                    // Phase 5: Focus Mode
                    isEditing && "bg-white dark:bg-gray-800 shadow-lg scale-[1.01] z-10 ring-1 ring-black/5 dark:ring-white/5"
                )}
                style={{ paddingLeft: `${depth * 24 + 12}px` }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                tabIndex={0}
            >
                {/* Controls: Drag + Expand + Check */}
                <div className="flex items-center gap-1 mt-0.5 relative -left-0.5">
                    {/* Expand Toggle */}
                    <button
                        onClick={handleToggleExpand}
                        className={clsx(
                            "p-0.5 rounded-md hover:bg-black/5 text-gray-400 hover:text-gray-600 transition-all duration-150 w-5 h-5 flex items-center justify-center dark:hover:bg-white/10 dark:hover:text-gray-300 active:scale-[0.97]",
                            (!hasSubtasks) && "opacity-0 md:group-hover/item:opacity-100 scale-90"
                        )}
                        aria-label={hasSubtasks ? (task.expanded ? "Collapse subtasks" : "Expand subtasks") : "No subtasks"}
                        aria-expanded={hasSubtasks ? task.expanded : undefined}
                        disabled={!hasSubtasks}
                    >
                        {task.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {/* Checkbox */}
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleTask(taskId); }}
                        className={clsx(
                            "w-4.5 h-4.5 rounded-[5px] border flex items-center justify-center transition-all duration-300 ml-0.5 shadow-sm",
                            "active:scale-90", // Satisfying press
                            task.completed
                                ? "bg-gray-800 border-gray-800 text-white dark:bg-gray-200 dark:border-gray-200 dark:text-black scale-105" // Checked state scale
                                : "bg-white border-gray-300 hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:hover:border-gray-500"
                        )}
                        role="checkbox"
                        aria-checked={task.completed}
                        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                    >
                        {task.completed && <Check size={10} strokeWidth={4} />}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 ml-2.5 min-w-0 pt-0.5">
                    <div className="flex items-center">
                        {isEditing ? (
                            <input
                                ref={inputRef}
                                value={task.title ?? ""}
                                onChange={(e) => updateTaskTitle(taskId, e.target.value)}
                                onBlur={() => setEditingTask(null)}
                                onKeyDown={handleKeyDown}
                                onClick={(e) => e.stopPropagation()} // Prevent row click
                                className="bg-transparent w-full outline-none text-[15px] leading-snug font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                            />
                        ) : (
                            <span
                                id={`task-title-${taskId}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTask(taskId);
                                }}
                                className={clsx(
                                    "task-title cursor-text select-none text-[15px] leading-snug font-medium transition-all duration-200",
                                    task.completed
                                        ? "text-gray-400 line-through decoration-gray-300 dark:text-gray-500 dark:decoration-gray-600 opacity-60"
                                        : "text-gray-900 dark:text-gray-100"
                                )}
                            >
                                {task.title}
                            </span>
                        )}
                    </div>

                    {/* Metadata Row (Tags, Due Date, Subtask count) */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={clsx(
                            "flex items-center gap-2 mt-1 text-[11px] font-medium text-gray-400 dark:text-gray-500 h-5",
                            (task.tags.length === 0 && !task.dueDate && !hasSubtasks && !(task.notes ?? "") && !showDatePicker && !showNotes) &&
                            (isSelected ? "flex" : "hidden group-hover/item:flex")
                        )}>
                        {/* Subtask progress */}
                        {hasSubtasks && (
                            <span
                                className="text-[11px] text-gray-400 dark:text-gray-500"
                                aria-label={`${(task.subtasks ?? []).filter(sid => tasks[sid]?.completed).length} of ${(task.subtasks ?? []).length} subtasks completed`}
                            >
                                {task.subtasks.filter(sid => tasks[sid]?.completed).length}/{task.subtasks.length}
                            </span>
                        )}


                        <div id={`list-selector-wrapper-${taskId}`} className="relative">
                            <ListSelector taskId={taskId} isVisible={isSelected} />
                        </div>

                        <div id={`tag-selector-wrapper-${taskId}`} className="relative">
                            <TagSelector taskId={taskId} isVisible={isSelected} />
                        </div>

                        {renderTags()}

                        {task.dueDate ? (
                            <div className="relative">
                                <button
                                    ref={dateTriggerRef as any}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDatePicker(!showDatePicker);
                                    }}
                                    className={clsx(
                                        "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-all duration-150 active:scale-[0.97]",
                                        isPast(task.dueDate) && !isToday(task.dueDate)
                                            ? "text-red-scale-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                                            : "text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                                    )}
                                >
                                    <Calendar size={10} strokeWidth={2.5} />
                                    <span>
                                        {formatDueDate(task.dueDate)}
                                        {task.dueTime && <span className="ml-1 opacity-75 text-[10px]">@{task.dueTime}</span>}
                                    </span>
                                </button>
                            </div>
                        ) : (
                            <div ref={dateTriggerRef as any} className="w-0 h-0" />
                        )}

                        {/* Notes Icon */}
                        {(task.notes ?? "") && (
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowNotes(!showNotes);
                                    }}
                                    className="flex items-center gap-1 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 transition-all duration-150 active:scale-[0.97]"
                                    aria-label="Edit notes"
                                >
                                    <AlignLeft size={12} />
                                </button>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className={clsx(
                            "flex items-center gap-1 ml-auto",
                            isSelected ? "opacity-100 pointer-events-auto" : "opacity-0 md:group-hover/item:opacity-100 pointer-events-none md:group-hover/item:pointer-events-auto transition-opacity"
                        )}>
                            <div className="relative">
                                <button
                                    ref={menuButtonRef}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpen(!menuOpen);
                                    }}
                                    className={clsx(
                                        "p-1.5 rounded-md text-gray-400 transition-all duration-150 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] active:scale-[0.97]",
                                        menuOpen ? "bg-black/5 text-gray-600 dark:bg-white/10 dark:text-gray-200" : ""
                                    )}
                                    aria-label="More actions"
                                >
                                    <MoreVertical size={14} />
                                </button>

                                {menuOpen && (
                                    <div
                                        className="absolute right-0 mt-1 w-48 rounded-xl border border-transparent bg-white/90 dark:bg-gray-900/90 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-xl z-50 py-1.5 pointer-events-auto animate-in fade-in zoom-in-95 duration-150 origin-top-right scale-100"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() => {
                                                setMenuOpen(false);
                                                const newSubtaskId = addTask('', taskId);
                                                setExpanded(taskId, true);
                                                if (newSubtaskId) setAutoEditTask(newSubtaskId);
                                            }}
                                            className="w-[calc(100%-8px)] mx-1 text-left px-3 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] flex items-center gap-2.5 transition-all duration-150 active:scale-[0.98]"
                                        >
                                            <Plus size={14} className="opacity-50" />
                                            <span>Add subtask</span>
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMenuOpen(false);
                                                setTimeout(() => {
                                                    setShowDatePicker(true);
                                                }, 0);
                                            }}
                                            className="w-[calc(100%-8px)] mx-1 text-left px-3 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] flex items-center gap-2.5 transition-all duration-150 active:scale-[0.98]"
                                        >
                                            <Calendar size={14} className="opacity-50" />
                                            <span>Set due date</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setMenuOpen(false);
                                                setShowNotes(true);
                                            }}
                                            className="w-[calc(100%-8px)] mx-1 text-left px-3 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] flex items-center gap-2.5 transition-all duration-150 active:scale-[0.98]"
                                        >
                                            <AlignLeft size={14} className="opacity-50" />
                                            <span>Add details</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setMenuOpen(false);
                                                const el = document.getElementById(`list-selector-wrapper-${taskId}`);
                                                el?.querySelector('button')?.click();
                                            }}
                                            className="w-[calc(100%-8px)] mx-1 text-left px-3 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] flex items-center gap-2.5 transition-all duration-150 active:scale-[0.98]"
                                        >
                                            <List size={14} className="opacity-50" />
                                            <span>Move to list</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setMenuOpen(false);
                                                const el = document.getElementById(`tag-selector-wrapper-${taskId}`);
                                                el?.querySelector('button')?.click();
                                            }}
                                            className="w-[calc(100%-8px)] mx-1 text-left px-3 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] flex items-center gap-2.5 transition-all duration-150 active:scale-[0.98]"
                                        >
                                            <Hash size={14} className="opacity-50" />
                                            <span>Tags</span>
                                        </button>

                                        <div className="h-px bg-gray-100 dark:bg-white/5 my-1.5 mx-2" />

                                        <button
                                            onClick={() => {
                                                setMenuOpen(false);
                                                setConfirmOpen(true);
                                            }}
                                            className="w-[calc(100%-8px)] mx-1 text-left px-3 py-2 text-sm font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-all duration-150 active:scale-[0.98]"
                                        >
                                            <Trash2 size={14} className="opacity-70" />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notes Field */}
                    {showNotes && (
                        <div className="mt-2 ml-7">
                            <textarea
                                ref={notesRef}
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                onClick={(e) => e.stopPropagation()} // Prevent row selection
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        e.stopPropagation();
                                        setShowNotes(false);
                                        setNoteDraft(task.notes ?? '');
                                    }
                                }}
                                onBlur={() => {
                                    // Save and collapse
                                    updateTask(taskId, { notes: noteDraft.trim() || undefined });
                                    setShowNotes(false);
                                }}
                                placeholder="Add notes..."
                                className="w-full bg-transparent text-sm text-gray-600 leading-relaxed resize-none outline-none border-l-2 border-gray-200 pl-3 py-1 placeholder:text-gray-400 dark:text-gray-300 dark:border-gray-700 dark:placeholder:text-gray-600 block rounded-r"
                                style={{
                                    fieldSizing: "content",
                                    minHeight: "2lh"
                                } as React.CSSProperties}
                                rows={Math.max(2, noteDraft.split('\n').length)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Recursive Children */}
            {
                task.expanded && hasSubtasks && (
                    <div className="">
                        {(task.subtasks ?? []).map(childId => {
                            const searchQuery = useTaskStore.getState().searchQuery.toLowerCase();
                            if (searchQuery) {
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
                )
            }

            {/* Confirm Delete Modal */}
            <ConfirmModal
                open={confirmOpen}
                title="Delete task"
                message={`Delete "${task.title || 'this task'}"?`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={() => {
                    cancelReminder(taskId);
                    deleteTask(taskId);
                    setConfirmOpen(false);
                }}
                onCancel={() => setConfirmOpen(false)}
            />
            {showDatePicker && createPortal(
                <div
                    ref={datePickerRef}
                    className="fixed w-64 max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl ring-1 ring-black/10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        position: 'fixed',
                        top: lockedPosition?.top ?? 0,
                        left: lockedPosition?.left ?? 0,
                        visibility: lockedPosition ? 'visible' : 'hidden',
                        zIndex: 9999
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="[&>div]:!static [&>div]:!shadow-none [&>div]:!border-none [&>div]:!w-full [&>div]:!mt-0">
                        <DatePicker
                            currentDate={task.dueDate}
                            onSelect={(date) => {
                                updateTask(taskId, { dueDate: date });
                            }}
                            onClose={() => setShowDatePicker(false)}
                        />
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800/50">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 font-medium block mb-1 px-1">
                            Time (optional)
                        </label>
                        <div className="relative">
                            <input
                                type="time"
                                value={task.dueTime || ''}
                                onChange={(e) => updateTask(taskId, { dueTime: e.target.value })}
                                className="w-full text-xs font-medium bg-gray-50 dark:bg-white/5 border-none rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none min-h-[32px]"
                                style={{
                                    WebkitAppearance: 'none'
                                }}
                            />
                            <Clock
                                size={14}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </li >
    );
};
