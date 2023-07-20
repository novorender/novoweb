export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export const daysToMs = (d: number) => d * 24 * 60 * 60 * 1000;
export const msToHrs = (ms: number) => ms / 1000 / 60 / 60;
export const msToDays = (ms: number) => msToHrs(ms) / 24;
