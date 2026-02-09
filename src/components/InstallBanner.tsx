import { useState } from "react";
import { useSimpleInstall } from "../hooks/usePWAInstall";

const STORAGE_KEY = "install-dismissed";

export default function InstallBanner() {
    const { canInstall, isIOS, isStandalone, promptInstall } = useSimpleInstall();
    const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(STORAGE_KEY));

    // Hide if already installed
    if (isStandalone) return null;

    // Hide if dismissed
    if (dismissed) return null;

    const handleClose = () => {
        localStorage.setItem(STORAGE_KEY, "1");
        setDismissed(true);
    };

    const handleInstall = async () => {
        await promptInstall();
    };

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md rounded-xl bg-blue-600 text-white p-4 shadow-lg z-40 pointer-events-auto">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    <div className="font-semibold text-base mb-1">Install Taskflow</div>
                    <div className="text-sm opacity-90">
                        {isIOS ? (
                            <>Tap <span className="font-semibold">Share</span> → <span className="font-semibold">Add to Home Screen</span></>
                        ) : canInstall ? (
                            "Use it like a real app."
                        ) : (
                            <>Tap the <span className="font-semibold">⋮</span> menu → <span className="font-semibold">Install app</span></>
                        )}
                    </div>
                    <div className="text-xs opacity-50 mt-1 font-mono">
                        DEBUG: can= {String(canInstall)}, Prompt={String((window as any).deferredPrompt ? 'YES' : 'NULL')}, SW_API={String('serviceWorker' in navigator)}, SW_Active={String(!!navigator.serviceWorker?.controller)}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {canInstall && !isIOS && (
                        <button
                            onClick={handleInstall}
                            className="bg-white text-blue-600 px-4 py-1.5 rounded font-medium hover:bg-gray-100 transition-colors whitespace-nowrap cursor-pointer"
                        >
                            Install
                        </button>
                    )}
                    <button
                        onClick={handleClose}
                        className="text-white opacity-70 hover:opacity-100 transition-opacity text-xl leading-none px-1 cursor-pointer"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
}
