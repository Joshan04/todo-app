import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Task, TaskState, Tag, List } from '../types';
import { firebaseService } from '../services/firebaseService';
import { useAuthStore } from './useAuthStore';

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

export const DEFAULT_TAGS: Tag[] = [
    { id: 't1', name: 'work', color: 'bg-blue-100 text-blue-800' },
    { id: 't2', name: 'personal', color: 'bg-green-100 text-green-800' },
    { id: 't3', name: 'urgent', color: 'bg-red-100 text-red-800' },
];

export const DEFAULT_LISTS: List[] = [
    { id: 'inbox', name: 'Inbox', icon: '📥' },
    { id: 'personal', name: 'Personal', icon: '🏠' },
    { id: 'work', name: 'Work', icon: '💼' },
];

export const useTaskStore = create<TaskState>()(
    persist(
        (set, get) => ({
            tasks: {},
            rootTaskIds: [],
            tags: DEFAULT_TAGS, // Task 2A -> Ensure strict start state with defaults
            lists: DEFAULT_LISTS, // Task 2A -> Ensure strict start state with defaults
            activeView: 'all',
            activeListId: null,
            activeTagId: null,
            selectedTaskId: null,
            editingTaskId: null,
            autoEditTaskId: null,
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

                // Optimistic UI update finished. Now sync to Firestore if user is logged in.
                const user = useAuthStore.getState().user;
                if (user) {
                    const finalState = get();
                    // We need the full task object we just created.
                    // Since we constructed 'newTask' above, we can just use it.
                    // But if parentId was provided, we also updated the parent's subtasks.
                    // And if it's a root task, we updated rootOrder.

                    // 1. Add the task itself
                    firebaseService.addTask(user.uid, newTask).catch(e => console.error(e));

                    // 2. Update parent if exists
                    if (parentId) {
                        const parent = finalState.tasks[parentId];
                        if (parent) {
                            firebaseService.updateTask(user.uid, parentId, { subtasks: parent.subtasks }).catch(e => console.error(e));
                        }
                    } else {
                        // 3. Update root order if no parent
                        firebaseService.updateRootOrder(user.uid, finalState.rootTaskIds).catch(e => console.error(e));
                    }
                }

                return id; // Return the new task ID
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
                                completedAt: isCompleting ? Date.now() : undefined,
                                // Auto-collapse when completing a parent task
                                expanded: isCompleting && hasSubtasks ? false : task.expanded
                            },
                        },
                    };
                });
                const user = useAuthStore.getState().user;
                if (user) {
                    const finalState = get(); // Re-get state to be sure, though inside set updater we knew the result.
                    // Actually, we can just use the Task object we modified.
                    // But to be safe and simple, let's just grab the latest from state.
                    const updatedTask = finalState.tasks[id];
                    if (updatedTask) {
                        firebaseService.updateTask(user.uid, id, {
                            completed: updatedTask.completed,
                            expanded: updatedTask.expanded,
                            completedAt: updatedTask.completedAt
                        }).catch(e => console.error(e));
                    }
                }
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
                const user = useAuthStore.getState().user;
                if (user) {
                    firebaseService.updateTask(user.uid, id, updates).catch(e => console.error(e));
                }
            },

            updateTaskTitle: (id, title) => {
                const safe = title ?? "";

                // 1. Guard for missing task
                if (!get().tasks[id]) {
                    console.error("[Armor] Missing task", id);
                    return;
                }

                console.log("[Armor] Title Update ->", id, safe);

                set((state) => {
                    return {
                        tasks: {
                            ...state.tasks,
                            [id]: {
                                ...state.tasks[id],
                                title: safe
                            }
                        }
                    };
                });

                const user = useAuthStore.getState().user;
                if (user) {
                    firebaseService.updateTask(user.uid, id, { title: safe }).catch(err => {
                        console.error("[Armor] Firestore write failed", err);
                    });
                }
            },

            deleteTask: (id) => {
                const state = get();
                const taskToDelete = state.tasks[id];
                if (!taskToDelete) return;

                // 1. Identify all IDs to delete (Cascade)
                const getDescendants = (taskId: string): string[] => {
                    const t = state.tasks[taskId];
                    if (!t) return [];
                    let ids: string[] = [];
                    t.subtasks.forEach(subId => {
                        ids.push(subId);
                        ids.push(...getDescendants(subId));
                    });
                    return ids;
                };
                const idsToDelete = [id, ...getDescendants(id)];

                // Capture parent/root info for Firestore update
                const parentId = taskToDelete.parentId;

                // 2. Local Update
                set((state) => {
                    const { [id]: deleted, ...remainingTasks } = state.tasks;
                    let newRootTaskIds = state.rootTaskIds;

                    // Helper to recursively delete children (local state)
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

                // 3. Firestore Sync
                const user = useAuthStore.getState().user;
                if (user) {
                    // A. Delete all tasks in subtree
                    firebaseService.deleteMultipleTasks(user.uid, idsToDelete).catch(e => console.error(e));

                    // B. Update Parent or Root
                    if (parentId) {
                        // We rely on the PREVIOUS state captured in `state` to find the parent.
                        // We need to calculate the NEW subtasks list for the parent.
                        const parent = state.tasks[parentId];
                        if (parent) {
                            const newSubtasks = parent.subtasks.filter(sid => sid !== id);
                            firebaseService.updateTask(user.uid, parentId, { subtasks: newSubtasks }).catch(e => console.error(e));
                        }
                    } else {
                        // Update Root Order
                        const newRootIds = state.rootTaskIds.filter(rid => rid !== id);
                        firebaseService.updateRootOrder(user.uid, newRootIds).catch(e => console.error(e));
                    }
                }
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
                const user = useAuthStore.getState().user;
                if (user) {
                    firebaseService.updateTask(user.uid, id, { expanded }).catch(e => console.error(e));
                }
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
            setEditingTask: (id: string | null) => set({ editingTaskId: id }),
            setAutoEditTask: (id: string | null) => set({ autoEditTaskId: id }),
            setSearchQuery: (query) => set({ searchQuery: query }),

            indentTask: (id: string) => {
                const state = get();
                const task = state.tasks[id];
                if (!task) return;

                // logic to find previous sibling
                let siblings: string[] = [];
                if (task.parentId) {
                    siblings = state.tasks[task.parentId]?.subtasks || [];
                } else {
                    siblings = state.rootTaskIds;
                }

                const index = siblings.indexOf(id);
                if (index <= 0) return;

                const prevSiblingId = siblings[index - 1];
                const prevSibling = state.tasks[prevSiblingId];
                if (!prevSibling) return;

                // Capture state for sync
                const oldParentId = task.parentId;
                const newParentId = prevSiblingId;

                set((state) => {
                    let newTasks = { ...state.tasks };
                    let newRootIds = state.rootTaskIds;

                    // Remove from current parent/root
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

                // Firestore Sync
                const user = useAuthStore.getState().user;
                if (user) {
                    const finalState = get();

                    // 1. Update Task (new parentId)
                    firebaseService.updateTask(user.uid, id, { parentId: newParentId }).catch(e => console.error(e));

                    // 2. Update New Parent (new subtasks, expanded)
                    const newParent = finalState.tasks[newParentId];
                    if (newParent) {
                        firebaseService.updateTask(user.uid, newParentId, {
                            subtasks: newParent.subtasks,
                            expanded: true
                        }).catch(e => console.error(e));
                    }

                    // 3. Update Old Parent OR Root (subtasks removed)
                    if (oldParentId) {
                        const oldParent = finalState.tasks[oldParentId];
                        if (oldParent) {
                            firebaseService.updateTask(user.uid, oldParentId, { subtasks: oldParent.subtasks }).catch(e => console.error(e));
                        }
                    } else {
                        firebaseService.updateRootOrder(user.uid, finalState.rootTaskIds).catch(e => console.error(e));
                    }
                }
            },

            outdentTask: (id: string) => {
                const state = get();
                const task = state.tasks[id];
                if (!task || !task.parentId) return;

                const parentId = task.parentId;
                const parent = state.tasks[parentId];
                if (!parent) return;

                const grandParentId = parent.parentId;

                set((state) => {
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

                // Firestore Sync
                const user = useAuthStore.getState().user;
                if (user) {
                    const finalState = get();

                    // 1. Update Task (new parentId)
                    firebaseService.updateTask(user.uid, id, { parentId: grandParentId || null }).catch(e => console.error(e));

                    // 2. Update Old Parent
                    const oldParent = finalState.tasks[parentId];
                    if (oldParent) {
                        firebaseService.updateTask(user.uid, parentId, { subtasks: oldParent.subtasks }).catch(e => console.error(e));
                    }

                    // 3. Update New Parent (Grandparent) OR Root
                    if (grandParentId) {
                        const grandParent = finalState.tasks[grandParentId];
                        if (grandParent) {
                            firebaseService.updateTask(user.uid, grandParentId, { subtasks: grandParent.subtasks }).catch(e => console.error(e));
                        }
                    } else {
                        firebaseService.updateRootOrder(user.uid, finalState.rootTaskIds).catch(e => console.error(e));
                    }
                }
            },

            getFilteredRootTaskIds: () => {
                const state = get();
                const { rootTaskIds, tasks, activeView, activeListId, activeTagId, showCompleted, sortBy, searchQuery } = state;
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const todayEnd = new Date();
                todayEnd.setHours(23, 59, 59, 999);

                // Sequential Guards: Search -> List -> Tag -> View -> Sort
                const safeRootIds = rootTaskIds ?? [];
                let filtered = safeRootIds.filter(taskId => {
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
                        return task.listId === activeListId;
                    }

                    // 3. Guard: Tag Mode (Exclusive, with hierarchy)
                    if (activeTagId !== null) {
                        const hasTagInTree = (taskId: string): boolean => {
                            const t = tasks[taskId];
                            if (!t) return false;

                            if (t.tags.includes(activeTagId)) return true;

                            return t.subtasks.some(childId => hasTagInTree(childId));
                        };

                        return hasTagInTree(taskId);
                    }

                    // 4. Guard: View Mode (Only if NO list or tag active)
                    if (activeView === 'completed') {
                        return task.completed;
                    }

                    if (!showCompleted && task.completed) return false;

                    if (activeView === 'today') {
                        if (!task.dueDate) return false;
                        if (task.dueDate < todayStart.getTime() || task.dueDate > todayEnd.getTime()) return false;
                    } else if (activeView === 'upcoming') {
                        if (!task.dueDate) return false;
                        if (task.dueDate <= todayEnd.getTime()) return false;
                    }

                    return true;
                });

                // 5. Apply sorting LAST
                if (sortBy !== 'manual') {
                    filtered = [...filtered].sort((a, b) => {
                        const taskA = tasks[a];
                        const taskB = tasks[b];

                        if (sortBy === 'created') {
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
                        const rootIndex = state.rootTaskIds.indexOf(taskId);
                        const newRootIds = [...state.rootTaskIds];
                        newRootIds.splice(rootIndex + 1, 0, newId);

                        return {
                            tasks: newTasks,
                            rootTaskIds: newRootIds,
                        };
                    }
                });

                // Firestore Sync
                const user = useAuthStore.getState().user;
                if (user) {
                    const finalState = get();
                    firebaseService.addTask(user.uid, newTask).catch(e => console.error(e));

                    if (task.parentId) {
                        const parent = finalState.tasks[task.parentId];
                        if (parent) {
                            firebaseService.updateTask(user.uid, task.parentId, { subtasks: parent.subtasks }).catch(e => console.error(e));
                        }
                    } else {
                        firebaseService.updateRootOrder(user.uid, finalState.rootTaskIds).catch(e => console.error(e));
                    }
                }

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

                const user = useAuthStore.getState().user;
                if (user) {
                    const finalState = get();
                    firebaseService.updateRootOrder(user.uid, finalState.rootTaskIds).catch(e => console.error(e));
                }
            },

            addTag: (name) => {
                const state = get();
                const normalized = name.trim().toLowerCase();
                const existing = state.tags.find(t => t.name.toLowerCase() === normalized);
                if (existing) return existing.id;

                const id = uuidv4();
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

                const newTag: Tag = { id, name: name.trim(), color };
                set({ tags: [...state.tags, newTag] });

                const user = useAuthStore.getState().user;
                if (user) {
                    firebaseService.addTag(user.uid, newTag).catch(e => console.error(e));
                }

                return id;
            },

            addList: (name) => {
                set((state) => {
                    const id = name.toLowerCase().replace(/\s+/g, '-');
                    if (state.lists.find(l => l.id === id)) return state;

                    const newList: List = { id, name, icon: '📝' };

                    const user = useAuthStore.getState().user;
                    if (user) {
                        firebaseService.addList(user.uid, newList).catch(e => console.error(e));
                    }

                    return { lists: [...state.lists, newList] };
                });
            },

            loadDefaults: () => {
                set({
                    lists: DEFAULT_LISTS,
                    tags: DEFAULT_TAGS,
                    tasks: {},
                    rootTaskIds: []
                });
            },

            syncRemoteState: (data) => {
                set((state) => ({
                    ...state,
                    tasks: data.tasks !== undefined ? data.tasks : state.tasks,
                    rootTaskIds: data.rootTaskIds !== undefined ? data.rootTaskIds : state.rootTaskIds,
                    lists: data.lists !== undefined ? data.lists : state.lists,
                    tags: data.tags !== undefined ? data.tags : state.tags,
                }));
            },
        }),
        {
            name: 'taskflow-storage',
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                try {
                    if (!state.tasks || typeof state.tasks !== 'object') {
                        state.tasks = {};
                    }
                    if (!Array.isArray(state.rootTaskIds)) {
                        state.rootTaskIds = [];
                    }
                    if (!Array.isArray(state.tags)) {
                        state.tags = DEFAULT_TAGS;
                    }
                    if (!Array.isArray(state.lists)) {
                        state.lists = DEFAULT_LISTS;
                    }
                } catch (e) {
                    console.error('Error rehydrating storage:', e);
                }
            }
        }
    )
);
