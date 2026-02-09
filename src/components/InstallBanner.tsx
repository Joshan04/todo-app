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
            <div className="flex justify-between items-center gap-4">
                <div className="flex-1">
                    <h3 className="font-semibold text-base">Install Taskflow</h3>
                    <p className="text-sm opacity-90 leading-tight mt-0.5">
                        {isIOS
                            ? "Tap Share → Add to Home Screen."
                            : "Add Taskflow to your device for quick access anytime."}
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {canInstall && !isIOS && (
                        <button
                            onClick={handleInstall}
                            className="bg-white text-blue-600 px-3 py-1.5 rounded-lg font-semibold text-sm hover:bg-opacity-90 transition-colors shadow-sm"
                        >
                            Install
                        </button>
                    )}
                    <button
                        onClick={handleClose}
                        className="text-white/80 hover:text-white text-sm font-medium transition-colors"
                    >
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
}
