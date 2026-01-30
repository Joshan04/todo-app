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
        tags: availableTags,
        selectedTaskId,
        selectTask
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

    const isSelected = selectedTaskId === taskId;

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

    const handleRowClick = () => {
        // Only for mobile
        if (window.innerWidth < 768) {
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
                onClick={handleRowClick}
                className={clsx(
                    "flex items-start py-1 px-2 -mx-2 rounded-md hover:bg-gray-100 group-hover/item:bg-gray-100 transition-colors dark:hover:bg-gray-800 dark:group-hover/item:bg-gray-800",
                    depth > 0 && "ml-4",
                    isFocused && "ring-2 ring-blue-500 ring-opacity-50",
                    isSelected && "bg-gray-100 dark:bg-gray-800" // Highlight on mobile selection
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
                                value={task.title}
                                onChange={(e) => updateTask(taskId, { title: e.target.value })}
                                onBlur={() => setIsEditing(false)}
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
                    <div className={clsx(
                        "flex items-center gap-3 mt-1 text-xs text-gray-400 h-5",
                        // Combined Visibility Logic:
                        // Always show if: 1. has metadata AND (desktop hover OR mobile selected)
                        // If NO metadata: hidden unless (desktop hover OR mobile selected)
                        // Wait, previous logic was: hidden group-hover:flex IF empty.
                        // If NOT empty, it was always flex? No, looking at lines 251:
                        // (task.tags.length === 0 && !task.dueDate && !hasSubtasks && !task.notes) && "hidden group-hover/item:flex"
                        // Meaning: if empty, hide until hover. If NOT empty, it's visible?
                        // Actually, lines 251 says: `className={clsx(..., (empty) && "hidden group-hover/item:flex")}`
                        // This means if it HAS content, it's always flex?
                        // Let's check original logic carefully.
                        // "flex items-center ... h-5" -> always flex unless condition.
                        // Condition: `(empty) && "hidden group-hover/item:flex"`
                        // So if empty, it's hidden by default, shown on hover.
                        // If NOT empty (e.g. has tags), it's ALWAYS visible?
                        // User request: "hovering a task reveals secondary actions".
                        // This implies actions are usually hidden?
                        // But if a task has a Date, is it visible?
                        // Desktop Notion: Date/Tags are visible if set. Actions (buttons) are hidden.
                        // Let's look at the Action Buttons row (DatePicker, TagSelector, Notes, Delete).
                        // I haven't reached that part yet in this replacement.
                        // This replacement covers lines 17-251~.
                        // The action buttons are further down.
                        // I should update THIS metadata row to follow selection logic if needed,
                        // AND the action buttons row below (not in this chunk yet or barely?).
                        // Actually, the Action Buttons are usually inside this Metadata Row or separate?
                        // I see `DatePicker`, `ListSelector` imports.
                        // I need to find where the action buttons are.
                        // They are likely AFTER line 260.
                        // I'll proceed with this chunk update first to setup state/handlers.
                        // And I'll update the metadata row logic to be safe.
                        (task.tags.length === 0 && !task.dueDate && !hasSubtasks && !task.notes) &&
                        (isSelected ? "flex" : "hidden group-hover/item:flex")
                    )}>
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
                            <div className={clsx("relative transition-opacity", (isSelected || showDatePicker) ? "opacity-100" : "opacity-0 group-hover/item:opacity-100")}>
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
                                    task.notes
                                        ? "text-gray-500 dark:text-gray-400"
                                        : (isSelected || showNotes)
                                            ? "text-gray-400"
                                            : "text-gray-400 opacity-0 group-hover/item:opacity-100"
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
