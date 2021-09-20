import { ObjectGroup } from "@novorender/data-js-api";

export const customGroups: ObjectGroup[] = Array.from({ length: 10 }).map((val, idx) =>
    createGroup(idx + 1, (idx + 1) % 5 === 0 ? "Grouped" : undefined)
);

function createGroup(num: number, grouping?: string): ObjectGroup {
    return {
        name: `Group ${num}`,
        ids: [],
        id: `group${num}`,
        color: Array.from({ length: 3 }).map(() => Number(Math.random().toFixed(2))) as [number, number, number],
        selected: false,
        hidden: false,
        grouping,
    };
}
