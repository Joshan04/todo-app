type TimeoutMap = Map<string, number>;

const timeouts: TimeoutMap = new Map();

export async function requestNotificationPermission() {
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
        try {
            await Notification.requestPermission();
        } catch { }
    }
}

export function scheduleReminder(
    taskId: string,
    title: string,
    dueDate: number
) {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const delay = dueDate - Date.now();
    if (delay <= 0) return;

    cancelReminder(taskId);

    const timeoutId = window.setTimeout(() => {
        new Notification(title || "Task due", {
            body: "Reminder",
            tag: taskId,
        });
        timeouts.delete(taskId);
    }, delay);

    timeouts.set(taskId, timeoutId);
}

export function cancelReminder(taskId: string) {
    const id = timeouts.get(taskId);
    if (id) {
        clearTimeout(id);
        timeouts.delete(taskId);
    }
}
