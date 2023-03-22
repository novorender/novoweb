export function toDBSN(machineId: string): string {
    return machineId
        .split("-")
        .map((str) => String(parseInt(str)))
        .filter((_, idx) => [0, 3, 4].includes(idx))
        .join("-")
        .replaceAll(/0{3,}/g, "-");
}
