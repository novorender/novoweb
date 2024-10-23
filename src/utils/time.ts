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

export function toLocalISOString(date?: Date) {
    if (!date) {
        return;
    }

    let offset = "Z";

    const tz = date.getTimezoneOffset();
    if (tz !== 0) {
        const tz_abs = Math.abs(tz);
        const tz_hour = Math.floor(tz_abs / 60);
        const tz_min = tz_abs % 60;
        offset = `${tz > 0 ? "-" : "+"}${tz_hour.toString().padStart(2, "0")}:${tz_min.toString().padStart(2, "0")}`;
    }

    return (
        date.getFullYear() +
        "-" +
        (date.getMonth() + 1).toString().padStart(2, "0") +
        "-" +
        date.getDate().toString().padStart(2, "0") +
        "T" +
        date.getHours().toString().padStart(2, "0") +
        ":" +
        date.getMinutes().toString().padStart(2, "0") +
        ":" +
        date.getSeconds().toString().padStart(2, "0") +
        `.000000000${offset}`
    );
}
