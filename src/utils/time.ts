export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export const daysToMs = (d: number) => hrsToMs(d * 24);
export const hrsToMs = (hrs: number) => minsToMs(hrs * 60);
export const minsToMs = (min: number) => secondsToMs(min * 60);
export const secondsToMs = (sec: number) => sec * 1000;

export const msToSeconds = (ms: number) => ms / 1000;
export const msToMins = (ms: number) => msToSeconds(ms) / 60;
export const msToHrs = (ms: number) => msToMins(ms) / 60;
export const msToDays = (ms: number) => msToHrs(ms) / 24;
