export type Priority = 'low' | 'medium' | 'high';

export interface Tag {
    id: string;
    name: string;
    color: string;
}

export interface List {
    id: string;
    name: string;
    icon: string;
}

export interface Task {
    id: string;
    title: string;
    completed: boolean;
    expanded: boolean;
    dueDate?: number | null; // timestamp
    tags: string[]; // tag IDs
    subtasks: string[]; // IDs of children
    parentId?: string | null;
    priority?: Priority;
    listId: string; // ID of the list this task belongs to
    notes?: string;
}

export type ViewType = 'all' | 'today' | 'upcoming' | 'completed';

export type SortOption = 'manual' | 'created' | 'dueDate';

export interface TaskState {
    tasks: Record<string, Task>;
    rootTaskIds: string[];
    tags: Tag[];
    lists: List[];
    activeView: ViewType;
    activeListId: string | null;
    activeTagId: string | null;
    selectedTaskId: string | null;
    showCompleted: boolean;
    sortBy: SortOption;
    searchQuery: string;

    // Actions
    addTask: (title: string, parentId?: string) => void;
    toggleTask: (id: string) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    setExpanded: (id: string, expanded: boolean) => void;
    setActiveView: (view: ViewType) => void;
    setActiveList: (listId: string | null) => void;
    setActiveTag: (tagId: string | null) => void;
    selectTask: (id: string | null) => void;
    setSearchQuery: (query: string) => void;
    addSubtask: (parentId: string, title: string) => void;
    indentTask: (id: string) => void;
    outdentTask: (id: string) => void;
    getFilteredRootTaskIds: () => string[];
    addSiblingTask: (taskId: string, title?: string) => string; // returns new task ID
    getVisibleTaskIds: () => string[];
    setShowCompleted: (show: boolean) => void;
    setSortBy: (sortBy: SortOption) => void;
    collapseAll: () => void;
    expandAll: () => void;
    clearCompleted: () => void;
    addList: (name: string) => void;
    addTag: (name: string) => string; // returns tag ID
}
