import { v4 as uuidv4 } from "uuid";

import { StorageKey } from "config/storage";
import { getFromStorage, saveToStorage } from "utils/storage";
import { Checklist, ChecklistInstance } from "./types";

let checklists: Checklist[] = [];

export function addChecklist(partialList: Omit<Checklist, "id">): [Checklist, Checklist[]] {
    const checklist = { ...partialList, id: uuidv4() };

    checklists = checklists.concat(checklist);
    saveToStorage(StorageKey.Checklists, JSON.stringify(checklists));

    return [checklist, checklists];
}

export function deleteChecklist(id: string): Checklist[] {
    checklists = checklists.filter((cl) => cl.id !== id);
    saveToStorage(StorageKey.Checklists, JSON.stringify(checklists));

    return checklists;
}

export function updateChecklist(id: string, updates: Partial<Omit<Checklist, "id">>): Checklist[] {
    checklists = checklists.map((cl) => (id === cl.id ? { ...cl, ...updates } : cl));
    saveToStorage(StorageKey.Checklists, JSON.stringify(checklists));

    return checklists;
}

export function parseChecklistsStorage(): Checklist[] {
    try {
        const str = getFromStorage(StorageKey.Checklists);

        checklists = str ? JSON.parse(str) : [];
        return checklists;
    } catch (e) {
        console.warn(e);
        return [];
    }
}

let checklistInstances: ChecklistInstance[] = [];

export function addChecklistInstances(partialInstances: Omit<ChecklistInstance, "id">[]): ChecklistInstance[] {
    checklistInstances = checklistInstances.concat(partialInstances.map((inst) => ({ ...inst, id: uuidv4() })));
    saveToStorage(StorageKey.ChecklistInstances, JSON.stringify(checklistInstances));

    return checklistInstances;
}

export function deleteChecklistInstance(id: string): ChecklistInstance[] {
    checklistInstances = checklistInstances.filter((cl) => cl.id !== id);
    saveToStorage(StorageKey.ChecklistInstances, JSON.stringify(checklistInstances));

    return checklistInstances;
}

export function updateChecklistInstance(
    id: string,
    updates: Partial<Omit<ChecklistInstance, "id">>
): ChecklistInstance[] {
    checklistInstances = checklistInstances.map((cl) => (id === cl.id ? { ...cl, ...updates } : cl));
    saveToStorage(StorageKey.ChecklistInstances, JSON.stringify(checklistInstances));

    return checklistInstances;
}

export function parseChecklistInstanceStorage(): ChecklistInstance[] {
    try {
        const str = getFromStorage(StorageKey.ChecklistInstances);

        checklistInstances = str ? JSON.parse(str) : [];
        return checklistInstances;
    } catch (e) {
        console.warn(e);
        return [];
    }
}
