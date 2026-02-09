import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

// TODO: Replace with your actual Firebase config or use environment variables
const firebaseConfig = {
    apiKey: "AIzaSyC9ZnhCzBXhLBTC2gzD_4Iw75k019FLzx0",
    authDomain: "todo-app-a9ae5.firebaseapp.com",
    projectId: "todo-app-a9ae5",
    storageBucket: "todo-app-a9ae5.firebasestorage.app",
    messagingSenderId: "220252419615",
    appId: "1:220252419615:web:7d5f209910aee9c8e6472a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Enable Offline Persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
    console.warn('Persistence error:', err.code);
});
