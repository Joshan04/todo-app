import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Task, TaskState, Tag, List } from '../types';

/**
 * Task Store Implementation
 * 
 * Filter Behavior & Ownership Rules:
 * 1. Only ONE primary filter context is active at a time:
 *    - View (All / Today / Upcoming)
 *    - OR List
 *    - OR Tag
 * 2. Search is a global refinement (AND logic) that applies on top of the primary context.
 * 3. Filter Sequence: Search -> List -> Tag -> View -> Sort.
 * 4. Recursion: If a child task matches Search, its parents are visible.
 * 
 * UX Rules:
 * - Tasks without due dates DO NOT appear in Today/Upcoming views.
 * - Creating a task inherits the active List/Tag context.
 */

const INITIAL_TAGS: Tag[] = [
    { id: 't1', name: 'work', color: 'bg-blue-100 text-blue-800' },
    { id: 't2', name: 'personal', color: 'bg-green-100 text-green-800' },
    { id: 't3', name: 'urgent', color: 'bg-red-100 text-red-800' },
];

const INITIAL_LISTS: List[] = [
    { id: 'inbox', name: 'Inbox', icon: '📥' },
    { id: 'personal', name: 'Personal', icon: '🏠' },
    { id: 'work', name: 'Work', icon: '💼' },
];

export const useTaskStore = create<TaskState>()(
    persist(
        (set, get) => ({
            tasks: {},
            rootTaskIds: [],
            tags: INITIAL_TAGS,
            lists: INITIAL_LISTS,
            activeView: 'all',
            activeListId: null,
            activeTagId: null,
            selectedTaskId: null,
            showCompleted: false,
            sortBy: 'manual',
            searchQuery: '',

            addTask: (title, parentId) => {
                const id = uuidv4();
                const state = get();
                const newTask: Task = {
                    id,
                    title,
                    completed: false,
                    expanded: true,
                    tags: state.activeTagId ? [state.activeTagId] : [], // Use active tag if in Tag mode
                    subtasks: [],
                    parentId: parentId || null,
                    dueDate: null, // Do not auto-assign dates
                    listId: state.activeListId || 'inbox', // Use active list or default to inbox
                };

                set((state) => {
                    const newTasks = { ...state.tasks, [id]: newTask };

                    if (parentId && state.tasks[parentId]) {
                        // Add as subtask
                        return {
                            tasks: {
                                ...newTasks,
                                [parentId]: {
                                    ...state.tasks[parentId],
                                    subtasks: [...state.tasks[parentId].subtasks, id],
                                    expanded: true, // Auto-expand parent
                                },
                            },
                        };
                    } else {
                        // Add as root task
                        return {
                            tasks: newTasks,
                            rootTaskIds: [id, ...state.rootTaskIds], // Prepend to top

                        };
                    }
                });
            },

            addSubtask: (parentId, title) => {
                get().addTask(title, parentId);
            },

            toggleTask: (id) => {
                set((state) => {
                    const task = state.tasks[id];
                    if (!task) return state;

                    const isCompleting = !task.completed;
                    const hasSubtasks = task.subtasks.length > 0;

                    return {
                        tasks: {
                            ...state.tasks,
                            [id]: {
                                ...task,
                                completed: isCompleting,
                                // Auto-collapse when completing a parent task
                                expanded: isCompleting && hasSubtasks ? false : task.expanded
                            },
                        },
                    };
                });
            },

            updateTask: (id, updates) => {
                set((state) => {
                    const task = state.tasks[id];
                    if (!task) return state;

                    return {
                        tasks: {
                            ...state.tasks,
                            [id]: { ...task, ...updates },
                        },
                    };
                });
            },

            deleteTask: (id) => {
                set((state) => {
                    const taskToDelete = state.tasks[id];
                    if (!taskToDelete) return state;

                    const { [id]: deleted, ...remainingTasks } = state.tasks;
                    let newRootTaskIds = state.rootTaskIds;

                    // Helper to recursively delete children
                    const deleteChildren = (taskId: string, currentTasks: Record<string, Task>) => {
                        const task = currentTasks[taskId];
                        if (!task) return currentTasks;

                        let tasks = { ...currentTasks };
                        task.subtasks.forEach(childId => {
                            tasks = deleteChildren(childId, tasks);
                            delete tasks[childId];
                        });
                        return tasks;
                    };

                    // Remove reference from parent if it exists
                    if (taskToDelete.parentId && remainingTasks[taskToDelete.parentId]) {
                        const parent = remainingTasks[taskToDelete.parentId];
                        remainingTasks[taskToDelete.parentId] = {
                            ...parent,
                            subtasks: parent.subtasks.filter((childId) => childId !== id),
                        };
                    } else {
                        // Remove from root if it's a root task
                        newRootTaskIds = state.rootTaskIds.filter(rootId => rootId !== id);
                    }

                    // Recursively delete subtasks from the store
                    const finalTasks = deleteChildren(id, remainingTasks);

                    return {
                        tasks: finalTasks,
                        rootTaskIds: newRootTaskIds,
                    };
                });
            },

            setExpanded: (id, expanded) => {
                set((state) => {
                    const task = state.tasks[id];
                    if (!task) return state;

                    return {
                        tasks: {
                            ...state.tasks,
                            [id]: { ...task, expanded },
                        },
                    };
                });
            },

            setActiveView: (view) => set({ activeView: view, activeListId: null, activeTagId: null }),
            setActiveList: (listId) => set((state) => ({
                activeListId: listId,
                activeTagId: null,
                activeView: state.activeView === 'completed' ? 'all' : state.activeView
            })),
            setActiveTag: (tagId) => set((state) => ({
                activeTagId: tagId,
                activeListId: null,
                activeView: state.activeView === 'completed' ? 'all' : state.activeView
            })),
            selectTask: (id) => set({ selectedTaskId: id }),
            setSearchQuery: (query) => set({ searchQuery: query }),

            indentTask: (id: string) => {
                set((state) => {
                    const task = state.tasks[id];
                    if (!task) return state;

                    // logic to find previous sibling
                    let siblings: string[] = [];
                    if (task.parentId) {
                        siblings = state.tasks[task.parentId]?.subtasks || [];
                    } else {
                        siblings = state.rootTaskIds;
                    }

                    const index = siblings.indexOf(id);
                    if (index <= 0) return state; // Can't indent if first child

                    const prevSiblingId = siblings[index - 1];
                    const prevSibling = state.tasks[prevSiblingId];

                    if (!prevSibling) return state;

                    // Remove from current parent/root
                    let newTasks = { ...state.tasks };
                    let newRootIds = state.rootTaskIds;

                    if (task.parentId) {
                        newTasks[task.parentId] = {
                            ...newTasks[task.parentId],
                            subtasks: siblings.filter(sid => sid !== id)
                        };
                    } else {
                        newRootIds = newRootIds.filter(rid => rid !== id);
                    }

                    // Add to new parent (prevSibling)
                    newTasks[prevSiblingId] = {
                        ...newTasks[prevSiblingId],
                        subtasks: [...newTasks[prevSiblingId].subtasks, id],
                        expanded: true
                    };

                    newTasks[id] = { ...newTasks[id], parentId: prevSiblingId };

                    return {
                        tasks: newTasks,
                        rootTaskIds: newRootIds
                    };
                });
            },

            outdentTask: (id: string) => {
                set((state) => {
                    const task = state.tasks[id];
                    if (!task || !task.parentId) return state; // Can't outdent if root

                    const parentId = task.parentId;
                    const parent = state.tasks[parentId];
                    if (!parent) return state;

                    // Grandparent?
                    const grandParentId = parent.parentId;

                    // Remove from parent
                    let newTasks = { ...state.tasks };
                    newTasks[parentId] = {
                        ...newTasks[parentId],
                        subtasks: parent.subtasks.filter(sid => sid !== id)
                    };

                    // Add to grandparent or root
                    let newRootIds = state.rootTaskIds;

                    if (grandParentId) {
                        const grandParent = newTasks[grandParentId];
                        // We need to insert after the parent
                        const parentIndex = grandParent.subtasks.indexOf(parentId);
                        const newSubtasks = [...grandParent.subtasks];
                        newSubtasks.splice(parentIndex + 1, 0, id);

                        newTasks[grandParentId] = {
                            ...grandParent,
                            subtasks: newSubtasks
                        };
                        newTasks[id] = { ...newTasks[id], parentId: grandParentId };
                    } else {
                        // Become root
                        const parentIndex = newRootIds.indexOf(parentId);
                        const newRoots = [...newRootIds];
                        newRoots.splice(parentIndex + 1, 0, id);
                        newRootIds = newRoots;
                        newTasks[id] = { ...newTasks[id], parentId: null };
                    }

                    return {
                        tasks: newTasks,
                        rootTaskIds: newRootIds
                    };
                });
            },

            getFilteredRootTaskIds: () => {
                const state = get();
                const { rootTaskIds, tasks, activeView, activeListId, activeTagId, showCompleted, sortBy, searchQuery } = state;
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const todayEnd = new Date();
                todayEnd.setHours(23, 59, 59, 999);

                // Sequential Guards: Search -> List -> Tag -> View -> Sort
                let filtered = rootTaskIds.filter(taskId => {
                    const task = tasks[taskId];
                    if (!task) return false;

                    // 1. Guard: Search Query (Always applies, refine context)
                    if (searchQuery.trim() !== '') {
                        const query = searchQuery.toLowerCase();

                        // Recursive search: check task and all descendants
                        const hasMatch = (tId: string): boolean => {
                            const t = tasks[tId];
                            if (!t) return false;

                            if (t.title.toLowerCase().includes(query)) return true;

                            // Check subtasks recursively
                            return t.subtasks.some(childId => hasMatch(childId));
                        };

                        if (!hasMatch(taskId)) return false;
                    }

                    // 2. Guard: List Mode (Exclusive)
                    if (activeListId !== null) {
                        // If we are in a list, we ONLY care if it matches the list.
                        // We DO NOT apply View filters (Today/Upcoming etc).
                        return task.listId === activeListId;
                    }

                    // 3. Guard: Tag Mode (Exclusive)
                    if (activeTagId !== null) {
                        // If we are in a tag, we ONLY care if it matches the tag.
                        // We DO NOT apply View filters.
                        return task.tags.includes(activeTagId);
                    }

                    // 4. Guard: View Mode (Only if NO list or tag active)
                    // Apply View-specific rules (including completion)

                    if (activeView === 'completed') {
                        return task.completed; // Completed view ONLY shows completed tasks.
                    }

                    // Completion Filter (Applied inside view logic only, skipped for 'completed' view)
                    // If showCompleted is false, hide completed tasks.
                    if (!showCompleted && task.completed) return false;

                    if (activeView === 'today') {
                        if (!task.dueDate) return false;
                        if (task.dueDate < todayStart.getTime() || task.dueDate > todayEnd.getTime()) return false;
                    } else if (activeView === 'upcoming') {
                        if (!task.dueDate) return false;
                        if (task.dueDate <= todayEnd.getTime()) return false;
                    }
                    // 'all' view passes through (after completion check)

                    return true;
                });

                // 5. Apply sorting LAST
                if (sortBy !== 'manual') {
                    filtered = [...filtered].sort((a, b) => {
                        const taskA = tasks[a];
                        const taskB = tasks[b];

                        if (sortBy === 'created') {
                            // Newer tasks first (assuming UUID-based IDs is approximation or we'd need created timestamp. 
                            // Using ID string comparison is rough but strict sort requires timestamp which Task doesn't have yet.
                            // Assuming implementation meant to rely on manual order usually.
                            return b.localeCompare(a);
                        } else if (sortBy === 'dueDate') {
                            const dateA = taskA.dueDate || Infinity;
                            const dateB = taskB.dueDate || Infinity;
                            return dateA - dateB;
                        }
                        return 0;
                    });
                }

                return filtered;
            },

            addSiblingTask: (taskId: string, title: string = '') => {
                const state = get();
                const task = state.tasks[taskId];
                if (!task) return '';

                const newId = uuidv4();
                const newTask: Task = {
                    id: newId,
                    title,
                    completed: false,
                    expanded: true,
                    tags: [],
                    subtasks: [],
                    parentId: task.parentId,
                    dueDate: null,
                    listId: task.listId, // Inherit list from sibling
                };

                set((state) => {
                    const newTasks = { ...state.tasks, [newId]: newTask };

                    if (task.parentId) {
                        // Add as sibling in parent's subtasks array
                        const parent = state.tasks[task.parentId];
                        if (!parent) return state;

                        const siblingIndex = parent.subtasks.indexOf(taskId);
                        const newSubtasks = [...parent.subtasks];
                        newSubtasks.splice(siblingIndex + 1, 0, newId);

                        return {
                            tasks: {
                                ...newTasks,
                                [task.parentId]: {
                                    ...parent,
                                    subtasks: newSubtasks,
                                },
                            },
                        };
                    } else {
                        // Add as sibling in root tasks
                        const rootIndex = state.rootTaskIds.indexOf(taskId);
                        const newRootIds = [...state.rootTaskIds];
                        newRootIds.splice(rootIndex + 1, 0, newId);

                        return {
                            tasks: newTasks,
                            rootTaskIds: newRootIds,
                        };
                    }
                });

                return newId;
            },

            getVisibleTaskIds: () => {
                const state = get();
                const visible: string[] = [];

                const traverse = (taskIds: string[]) => {
                    taskIds.forEach(id => {
                        const task = state.tasks[id];
                        if (!task) return;

                        visible.push(id);

                        // Only traverse children if expanded
                        if (task.expanded && task.subtasks.length > 0) {
                            traverse(task.subtasks);
                        }
                    });
                };

                traverse(state.getFilteredRootTaskIds());
                return visible;
            },

            setShowCompleted: (show) => set({ showCompleted: show }),

            setSortBy: (sortBy) => set({ sortBy }),

            collapseAll: () => {
                set((state) => {
                    const newTasks = { ...state.tasks };
                    Object.keys(newTasks).forEach(id => {
                        if (newTasks[id].subtasks.length > 0) {
                            newTasks[id] = { ...newTasks[id], expanded: false };
                        }
                    });
                    return { tasks: newTasks };
                });
            },

            expandAll: () => {
                set((state) => {
                    const newTasks = { ...state.tasks };
                    Object.keys(newTasks).forEach(id => {
                        if (newTasks[id].subtasks.length > 0) {
                            newTasks[id] = { ...newTasks[id], expanded: true };
                        }
                    });
                    return { tasks: newTasks };
                });
            },

            clearCompleted: () => {
                set((state) => {
                    const newTasks = { ...state.tasks };
                    const newRootIds = [...state.rootTaskIds];

                    // Find and remove completed root tasks
                    const completedRootIds = newRootIds.filter(id => newTasks[id]?.completed);
                    completedRootIds.forEach(id => {
                        delete newTasks[id];
                    });

                    return {
                        tasks: newTasks,
                        rootTaskIds: newRootIds.filter(id => !completedRootIds.includes(id))
                    };
                });
            },
            addTag: (name) => {
                const state = get();
                const normalized = name.trim().toLowerCase();
                const existing = state.tags.find(t => t.name.toLowerCase() === normalized);
                if (existing) return existing.id;

                const id = uuidv4();
                // Cycle through colors or random
                const colors = [
                    'bg-blue-100 text-blue-800',
                    'bg-green-100 text-green-800',
                    'bg-red-100 text-red-800',
                    'bg-yellow-100 text-yellow-800',
                    'bg-purple-100 text-purple-800',
                    'bg-pink-100 text-pink-800',
                    'bg-gray-100 text-gray-800',
                ];
                const color = colors[state.tags.length % colors.length];

                const newTag: Tag = { id, name: name.trim(), color }; // Store original case for display
                set({ tags: [...state.tags, newTag] });
                return id;
            },
            addList: (name) => {
                set((state) => {
                    const id = name.toLowerCase().replace(/\s+/g, '-');
                    // Check duplicate
                    if (state.lists.find(l => l.id === id)) return state;

                    const newList: List = { id, name, icon: '📝' };
                    return { lists: [...state.lists, newList] };
                });
            },
        }),
        {
            name: 'taskflow-storage',
            onRehydrateStorage: () => (state) => {
                // Validate and sanitize rehydrated state
                if (!state) return;

                try {
                    // Ensure tasks is a valid object
                    if (!state.tasks || typeof state.tasks !== 'object') {
                        state.tasks = {};
                    }

                    // Ensure rootTaskIds is a valid array
                    if (!Array.isArray(state.rootTaskIds)) {
                        state.rootTaskIds = [];
                    }

                    // Clean up any invalid task references in rootTaskIds
                    state.rootTaskIds = state.rootTaskIds.filter(id => state.tasks[id]);

                    // Clean up any invalid subtask references
                    Object.keys(state.tasks).forEach(taskId => {
                        const task = state.tasks[taskId];
                        if (task.subtasks) {
                            task.subtasks = task.subtasks.filter(subId => state.tasks[subId]);
                        }
                    });

                    // Validate Active Context Persistence
                    // If activeListId or activeTagId points to a missing item, reset to default View (All).
                    if (state.activeListId && !state.lists.find(l => l.id === state.activeListId)) {
                        state.activeListId = null;
                        state.activeView = 'all';
                    }
                    if (state.activeTagId && !state.tags.find(t => t.id === state.activeTagId)) {
                        state.activeTagId = null;
                        state.activeView = 'all';
                    }

                    // Ensure strict mutual exclusivity is respected on reload (defensive)
                    if (state.activeListId) {
                        state.activeTagId = null; // List takes precedence or just ensure single mode
                    } else if (state.activeTagId) {
                        state.activeListId = null;
                    }

                } catch (error) {
                    console.error('Error rehydrating state, using defaults:', error);
                    // Reset to safe defaults on error
                    state.tasks = {};
                    state.rootTaskIds = [];
                    state.activeView = 'all';
                    state.activeListId = null;
                    state.activeTagId = null;
                }
            },
        }
    )
);
