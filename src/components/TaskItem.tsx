import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Check, Calendar, AlignLeft, Plus, Trash2, MoreVertical, Hash, List } from 'lucide-react';
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
                    "flex items-start py-1 px-4 -mx-4 rounded-md hover:bg-gray-100 group-hover/item:bg-gray-100 transition-colors dark:hover:bg-gray-800 dark:group-hover/item:bg-gray-800",
                    isFocused && "ring-2 ring-blue-500 ring-opacity-50",
                    isSelected && "bg-gray-100 dark:bg-gray-800" // Highlight on mobile selection
                )}
                style={{ paddingLeft: `${depth * 24 + 16}px` }}
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
                            (!hasSubtasks) && "opacity-0 md:group-hover/item:opacity-100"
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
                                value={task.title ?? ""}
                                onChange={(e) => updateTaskTitle(taskId, e.target.value)}
                                onBlur={() => setEditingTask(null)}
                                onKeyDown={handleKeyDown}
                                onClick={(e) => e.stopPropagation()} // Prevent row click
                                className="bg-transparent w-full outline-none border-b border-blue-500 pb-0.5 text-gray-900 dark:text-gray-100"
                            />
                        ) : (
                            <span
                                id={`task-title-${taskId}`}
                                onClick={(e) => {
                                    e.stopPropagation(); // Handle edit click separately to avoid conflict? Or let it bubble?
                                    // Original logic: click title -> edit.
                                    // Row tap should toggle selection.
                                    // Requirement: "Tap title -> Edit" (implied desktop behavior parity).
                                    // Mobile: If title is tapped, maybe edit? Or reveal actions?
                                    // User said: "Tap task row toggles active state".
                                    // Actually, let's allow row click to handle selection. Title click is specific action.
                                    // If title click triggers edit, it shouldn't toggle selection?
                                    // Let's keep title edit logic but stop propagation so it doesn't trigger row selection toggle if desired.
                                    setEditingTask(taskId);
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
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={clsx(
                            "flex items-center gap-3 mt-1 text-xs text-gray-400 h-5",
                            // Combined Visibility Logic:
                            // Always show if: 1. has metadata AND (desktop hover OR mobile selected)
                            // If NO metadata: hidden unless (desktop hover OR mobile selected)
                            (task.tags.length === 0 && !task.dueDate && !hasSubtasks && !(task.notes ?? "") && !showDatePicker && !showNotes) &&
                            (isSelected ? "flex" : "hidden group-hover/item:flex")
                        )}>
                        {/* Subtask progress */}
                        {hasSubtasks && (
                            <span
                                className=""
                                aria-label={`${(task.subtasks ?? []).filter(sid => tasks[sid]?.completed).length} of ${(task.subtasks ?? []).length} subtasks completed`}
                            >
                                {task.subtasks.filter(sid => tasks[sid]?.completed).length}/{task.subtasks.length} subtasks
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDatePicker(!showDatePicker);
                                    }}
                                    className={clsx(
                                        "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium",
                                        isPast(task.dueDate) && !isToday(task.dueDate)
                                            ? "text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
                                            : "text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-200 dark:hover:bg-orange-900/50"
                                    )}
                                >
                                    <Calendar size={10} />
                                    <span>
                                        {formatDueDate(task.dueDate)}
                                        {task.dueTime && <span className="ml-1 opacity-75 text-[10px]">@{task.dueTime}</span>}
                                    </span>
                                </button>
                                {showDatePicker && (
                                    <div
                                        className="absolute top-full left-0 mt-2 z-50 w-64 max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-md shadow-lg overflow-hidden flex flex-col"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="[&>div]:!static [&>div]:!shadow-none [&>div]:!border-none [&>div]:!w-full [&>div]:!mt-0">
                                            <DatePicker
                                                currentDate={task.dueDate}
                                                onSelect={(date) => {
                                                    updateTask(taskId, { dueDate: date });
                                                    // Don't close immediately if we want to allow time pick? 
                                                    // User flow: Pick date -> Pick time. 
                                                    // Existing DatePicker closes on select (except clear).
                                                    // If we want to support time, maybe we should keep it open?
                                                    // But DatePicker props don't allow "stay open".
                                                    // We can just reopen it? Or rely on user to re-open?
                                                    // No, "Click 'Add date' -> DatePicker opens immediately."
                                                    // Let's modify behavior: If they pick date, keep open?
                                                    // We can't controlled 'keep open' easily without modifying DatePicker logic which calls onClose.
                                                    // However, onClose prop is ours!
                                                    // We can IGNORE onClose if the click was inside our wrapper?
                                                    // But DatePicker calls onClose after selection.
                                                    // So if we ignore it, it stays open.
                                                    // But we should close eventually.
                                                }}
                                                onClose={() => setShowDatePicker(false)}
                                            />
                                        </div>

                                        <div className="border-t border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800/50">
                                            <label className="text-[10px] text-gray-500 font-medium block mb-1 px-1">
                                                Time (optional)
                                            </label>
                                            <input
                                                type="time"
                                                value={task.dueTime || ''}
                                                onChange={(e) => updateTask(taskId, { dueTime: e.target.value })}
                                                className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Only show DatePicker when active (triggered via menu)
                            showDatePicker ? (
                                <div className="relative">
                                    <div
                                        className="absolute top-full left-0 mt-2 z-50 w-64 max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-md shadow-lg overflow-hidden flex flex-col"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="[&>div]:!static [&>div]:!shadow-none [&>div]:!border-none [&>div]:!w-full [&>div]:!mt-0">
                                            <DatePicker
                                                currentDate={null}
                                                onSelect={(date) => {
                                                    updateTask(taskId, { dueDate: date });
                                                    // setShowDatePicker(false); 
                                                }}
                                                onClose={() => setShowDatePicker(false)}
                                            />
                                        </div>
                                        <div className="border-t border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800/50">
                                            <label className="text-[10px] text-gray-500 font-medium block mb-1 px-1">
                                                Time (optional)
                                            </label>
                                            <input
                                                type="time"
                                                value={task.dueTime || ''}
                                                onChange={(e) => updateTask(taskId, { dueTime: e.target.value })}
                                                className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : null
                        )}
                        {/* Notes Icon (Only if notes exist) */}
                        {(task.notes ?? "") && (
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowNotes(!showNotes);
                                    }}
                                    className="flex items-center gap-1 rounded text-[11px] hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-gray-500 dark:text-gray-400"
                                    aria-label="Edit notes"
                                >
                                    <AlignLeft size={10} />
                                </button>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className={clsx(
                            "flex items-center gap-2 ml-auto",
                            isSelected ? "opacity-100" : "opacity-0 md:group-hover/item:opacity-100"
                        )}>
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpen(!menuOpen);
                                    }}
                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    aria-label="More actions"
                                >
                                    <MoreVertical size={16} />
                                </button>

                                {menuOpen && (
                                    <div
                                        className="absolute right-0 mt-1 w-48 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50 py-1"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() => {
                                                setMenuOpen(false);
                                                const newSubtaskId = addTask('', taskId);
                                                setExpanded(taskId, true);
                                                if (newSubtaskId) setAutoEditTask(newSubtaskId);
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                                        >
                                            <Plus size={14} className="opacity-70" />
                                            <span>Add subtask</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setMenuOpen(false);
                                                setShowDatePicker(true);
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                                        >
                                            <Calendar size={14} className="opacity-70" />
                                            <span>Add date</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setMenuOpen(false);
                                                setShowNotes(true);
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                                        >
                                            <AlignLeft size={14} className="opacity-70" />
                                            <span>Add note</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setMenuOpen(false);
                                                const el = document.getElementById(`list-selector-wrapper-${taskId}`);
                                                el?.querySelector('button')?.click();
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                                        >
                                            <List size={14} className="opacity-70" />
                                            <span>Move to list</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setMenuOpen(false);
                                                const el = document.getElementById(`tag-selector-wrapper-${taskId}`);
                                                el?.querySelector('button')?.click();
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                                        >
                                            <Hash size={14} className="opacity-70" />
                                            <span>Tags</span>
                                        </button>

                                        <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />

                                        <button
                                            onClick={() => {
                                                setMenuOpen(false);
                                                setConfirmOpen(true);
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
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
                                        setNoteDraft(task.notes ?? '');
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
            {
                task.expanded && hasSubtasks && (
                    <div className="">
                        {(task.subtasks ?? []).map(childId => {
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
        </li >
    );
};
