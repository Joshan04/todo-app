import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
    if (typeof window === 'undefined') {
        return 'light';
    }

    // Check localStorage
    const stored = localStorage.getItem('theme');

    // Validate stored value
    if (stored === 'light' || stored === 'dark') {

        return stored;
    }

    // Invalid or missing value - default to light
    return 'light';
}

function applyTheme(theme: Theme) {
    const root = document.documentElement;

    // Remove both classes first to avoid conflicts
    root.classList.remove('light', 'dark');

    // Add the new theme class
    root.classList.add(theme);

    // Persist to localStorage
    localStorage.setItem('theme', theme);


}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);

    // Apply theme immediately on mount and whenever it changes
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        applyTheme(newTheme);
        setThemeState(newTheme);
    };

    return { theme, setTheme };
}
