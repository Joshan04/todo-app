import { doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Task, List, Tag } from '../types';

export const firebaseService = {
    // Tasks
    addTask: async (userId: string, task: Task) => {
        await setDoc(doc(db, 'users', userId, 'tasks', task.id), task);
    },

    updateTask: async (userId: string, taskId: string, updates: Partial<Task>) => {
        await updateDoc(doc(db, 'users', userId, 'tasks', taskId), updates);
    },

    deleteTask: async (userId: string, taskId: string) => {
        // We might need to delete subtasks too, but the store handles recursive local deletion.
        // For Firestore, if we want to be strict, we should delete subtasks recursively.
        // However, the prompt says "The store already computes the final truth."
        // But `deleteTask` in store removes them from state.
        // If we only delete the parent in Firestore, orphans might remain if we don't batch delete.
        // Strategy: The store's `deleteTask` logic finds all descendants.
        // We should probably pass ALL deleted IDs to the service to batch delete.
        // Refinement: I will add `deleteMultipleTasks`.
        await deleteDoc(doc(db, 'users', userId, 'tasks', taskId));
    },

    deleteMultipleTasks: async (userId: string, taskIds: string[]) => {
        const batch = writeBatch(db);
        taskIds.forEach(id => {
            batch.delete(doc(db, 'users', userId, 'tasks', id));
        });
        await batch.commit();
    },

    updateMultipleTasks: async (userId: string, tasks: Partial<Task> & { id: string }[]) => {
        const batch = writeBatch(db);
        tasks.forEach(task => {
            const { id, ...updates } = task;
            batch.update(doc(db, 'users', userId, 'tasks', id), updates);
        });
        await batch.commit();
    },

    // Lists
    addList: async (userId: string, list: List) => {
        await setDoc(doc(db, 'users', userId, 'lists', list.id), list);
    },

    updateList: async (userId: string, listId: string, updates: Partial<List>) => {
        await updateDoc(doc(db, 'users', userId, 'lists', listId), updates);
    },

    deleteList: async (userId: string, listId: string) => {
        await deleteDoc(doc(db, 'users', userId, 'lists', listId));
    },

    // Tags
    addTag: async (userId: string, tag: Tag) => {
        await setDoc(doc(db, 'users', userId, 'tags', tag.id), tag);
    },

    updateTag: async (userId: string, tagId: string, updates: Partial<Tag>) => {
        await updateDoc(doc(db, 'users', userId, 'tags', tagId), updates);
    },

    deleteTag: async (userId: string, tagId: string) => {
        await deleteDoc(doc(db, 'users', userId, 'tags', tagId));
    },

    // Root Order
    updateRootOrder: async (userId: string, order: string[]) => {
        await setDoc(doc(db, 'users', userId, 'metadata', 'root'), { order }, { merge: true });
    }
};
