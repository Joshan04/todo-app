import { useEffect, useState } from "react";

export function useSimpleInstall() {
    // We use a dummy state to force re-renders when the global variable changes
    const [, forceUpdate] = useState({});

    useEffect(() => {
        const handleGlobalChange = () => {
            console.log('Taskflow: [Hook] Detected global change, forcing update');
            forceUpdate({});
        };

        window.addEventListener("beforeinstallprompt", handleGlobalChange);
        window.addEventListener("pwa-install-ready", handleGlobalChange);

        // Safety check: if global is already set but we haven't re-rendered yet
        if ((window as any).deferredPrompt) {
            forceUpdate({});
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handleGlobalChange);
            window.removeEventListener("pwa-install-ready", handleGlobalChange);
        };
    }, []);

    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

    // Read directly from global source of truth
    // This avoids React state failing to sync with the window object
    const deferredPrompt = typeof window !== 'undefined' ? (window as any).deferredPrompt : null;
    const canInstall = !!deferredPrompt;

    const promptInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Taskflow: Install prompt outcome: ${outcome}`);
        // Clear global if accepted? Usually browser invalidates it anyway.
        if (outcome === 'accepted') {
            (window as any).deferredPrompt = null;
            forceUpdate({});
        }
    };

    return {
        canInstall,
        isIOS,
        isStandalone,
        promptInstall,
    };
}
