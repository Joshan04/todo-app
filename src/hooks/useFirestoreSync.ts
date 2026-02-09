import { useEffect } from 'react';
import { collection, doc, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useTaskStore, DEFAULT_LISTS, DEFAULT_TAGS } from '../store/useTaskStore';
import type { Task, List, Tag } from '../types';

export function useFirestoreSync() {
    const { user } = useAuthStore();
    const { syncRemoteState } = useTaskStore();

    useEffect(() => {
        if (!user) {
            // When user logs out, we could reset state here if desired, 
            // but for now we just stop listening.
            // A reset might kill local-only data if not handled carefully, 
            // but per instructions "When user becomes null: Reset store to default local state."
            // We will trigger a sync with empty/default data to clear the view.
            useTaskStore.getState().loadDefaults();
            return;
        }

        const userId = user.uid;

        // 0. Bootstrap Defaults (Once per login)
        const bootstrapDefaults = async () => {
            try {
                // Check Lists
                const listsRef = collection(db, 'users', userId, 'lists');
                const listsSnap = await getDocs(listsRef);

                if (listsSnap.empty) {
                    const batch = writeBatch(db);
                    DEFAULT_LISTS.forEach(list => {
                        const ref = doc(listsRef, list.id);
                        batch.set(ref, list);
                    });

                    // Check Tags
                    const tagsRef = collection(db, 'users', userId, 'tags');
                    const tagsSnap = await getDocs(tagsRef);
                    if (tagsSnap.empty) {
                        DEFAULT_TAGS.forEach(tag => {
                            const ref = doc(tagsRef, tag.id);
                            batch.set(ref, tag);
                        });
                    }

                    await batch.commit();
                    console.log("[Sync] Bootstrapped default lists/tags");
                }
            } catch (err) {
                console.error("[Sync] Bootstrap failed:", err);
            }
        };

        bootstrapDefaults();

        // 1. Listen to Tasks
        const unsubscribeTasks = onSnapshot(collection(db, 'users', userId, 'tasks'), (snapshot) => {
            console.log("[Armor] Snapshot tasks:", snapshot.size);
            const tasks: Record<string, Task> = {};
            snapshot.forEach((doc) => {
                const raw = doc.data() as Partial<Task>;
                tasks[doc.id] = {
                    id: doc.id,
                    ...raw,
                    title: raw.title ?? "",
                    completed: raw.completed ?? false,
                    expanded: raw.expanded ?? false,
                    subtasks: raw.subtasks ?? [],
                    tags: raw.tags ?? [],
                    listId: raw.listId ?? 'inbox',
                    notes: raw.notes ?? "",
                    dueDate: raw.dueDate ?? null,
                    parentId: raw.parentId ?? null
                } as Task;
            });
            console.log("[Armor] Tasks sanitized:", Object.keys(tasks).length);
            console.log("[Sync] Tasks Update:", Object.keys(tasks).length);

            useTaskStore.setState((state) => ({
                tasks: tasks
            }));
        });

        // 2. Listen to Lists
        const unsubscribeLists = onSnapshot(collection(db, 'users', userId, 'lists'), (snapshot) => {
            const lists: List[] = [];
            snapshot.forEach((doc) => lists.push(doc.data() as List));
            useTaskStore.setState({ lists: lists ?? [] });
        });

        // 3. Listen to Tags
        const unsubscribeTags = onSnapshot(collection(db, 'users', userId, 'tags'), (snapshot) => {
            const tags: Tag[] = [];
            snapshot.forEach((doc) => tags.push(doc.data() as Tag));
            useTaskStore.setState({ tags: tags ?? [] });
        });

        // 4. Listen to Root Order
        const unsubscribeRoot = onSnapshot(doc(db, 'users', userId, 'metadata', 'root'), (docSnap) => {
            const order = docSnap.exists() ? (docSnap.data()?.order ?? []) : [];
            console.log("[Sync] Root Order Update:", order.length);
            useTaskStore.setState({ rootTaskIds: order });
        });

        return () => {
            unsubscribeTasks();
            unsubscribeLists();
            unsubscribeTags();
            unsubscribeRoot();
        };
    }, [user, syncRemoteState]);
}
