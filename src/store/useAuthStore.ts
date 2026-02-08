import { create } from 'zustand';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    type User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    setUser: (user: User | null) => void;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, pass: string, isSignUp: boolean) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: true, // Start loading to check initial auth state
    error: null,

    setUser: (user) => set({ user, isLoading: false }),

    signInWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // onAuthStateChanged will handle the state update
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    signInWithEmail: async (email, pass, isSignUp) => {
        set({ isLoading: true, error: null });
        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, pass);
            } else {
                await signInWithEmailAndPassword(auth, email, pass);
            }
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    logout: async () => {
        set({ isLoading: true, error: null });
        try {
            await signOut(auth);
            set({ user: null, isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    clearError: () => set({ error: null })
}));

// Initialize listener
onAuthStateChanged(auth, (user) => {
    useAuthStore.getState().setUser(user);
});
