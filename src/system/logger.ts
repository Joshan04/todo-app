import { ENV } from "../config/env";

export const log = (...args: any[]) => {
    if (ENV.isDev) console.log(...args);
};
