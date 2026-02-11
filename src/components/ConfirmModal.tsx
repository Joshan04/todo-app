

type Props = {
    open: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmModal({
    open,
    title = 'Confirm',
    message,
    confirmText = 'Delete',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
}: Props) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-xl bg-zinc-900 p-5 shadow-2xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-150">
                <h2 className="text-lg font-semibold mb-2 text-white">{title}</h2>
                <p className="text-sm text-zinc-300 mb-4">{message}</p>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
                    >
                        {cancelText}
                    </button>

                    <button
                        onClick={onConfirm}
                        className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
