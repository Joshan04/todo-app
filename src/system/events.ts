type EventMap = {
    taskCompleted: { id: string };
    taskCreated: { id: string };
};

type Listener<K extends keyof EventMap> = (payload: EventMap[K]) => void;

const listeners: { [K in keyof EventMap]?: Listener<K>[] } = {};

export function emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
    listeners[event]?.forEach(l => l(payload));
}

export function on<K extends keyof EventMap>(event: K, cb: Listener<K>) {
    listeners[event] ??= [];
    listeners[event]!.push(cb);
}
