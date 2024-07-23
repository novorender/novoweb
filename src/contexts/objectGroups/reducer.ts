import { SearchPattern } from "@novorender/webgl-api";
import { createContext, Dispatch, MutableRefObject } from "react";

import { VecRGB, VecRGBA } from "utils/color";

export enum GroupStatus {
    None = "none",
    Selected = "selected",
    Hidden = "hidden",
    Frozen = "frozen",
}

export type ImmutableObjectIdSet = Omit<Set<number>, "add" | "clear" | "delete">;

export interface ObjectGroup {
    id: string;
    name: string;
    grouping: string;
    // We rely on ids immutability for quick checks when setting highlights
    ids: ImmutableObjectIdSet;
    color: VecRGB | VecRGBA;
    status: GroupStatus;
    opacity: number;
    search: SearchPattern[];
    includeDescendants: boolean;
}

export const initialState = [] as ObjectGroup[];

export type State = typeof initialState;

export enum InternalTemporaryGroup {
    BIMcollab = "NOVORENDER_INTERNAL_TMP/BIMcollab temporary",
}

enum ActionTypes {
    Update,
    Set,
    Add,
    Delete,
    Reset,
    Copy,
    GroupSelected,
}

function update(groupId: string, updates: Partial<ObjectGroup>) {
    return {
        type: ActionTypes.Update as const,
        groupId,
        updates,
    };
}

function deleteGroup(groupId: string) {
    return {
        type: ActionTypes.Delete as const,
        groupId,
    };
}

function set(state: State) {
    return {
        type: ActionTypes.Set as const,
        state,
    };
}

function reset() {
    return {
        type: ActionTypes.Reset as const,
    };
}

function add(toAdd: State) {
    return {
        type: ActionTypes.Add as const,
        toAdd,
    };
}

function copy(id: string) {
    return {
        type: ActionTypes.Copy as const,
        id,
    };
}

function groupSelected() {
    return {
        type: ActionTypes.GroupSelected as const,
    };
}

export const actions = { update, set, add, copy, reset, groupSelected, delete: deleteGroup };

type Actions = ReturnType<(typeof actions)[keyof typeof actions]>;
export type DispatchObjectGroups = Dispatch<Actions>;
export type LazyContextType = MutableRefObject<State>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StateContext = createContext<State>(undefined as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LazyStateContext = createContext<LazyContextType>(undefined as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DispatchContext = createContext<DispatchObjectGroups>(undefined as any);

export function reducer(state: State, action: Actions): ObjectGroup[] {
    switch (action.type) {
        case ActionTypes.Delete: {
            return state.filter((group) => group.id !== action.groupId);
        }
        case ActionTypes.Update: {
            const updated = state.map((group) =>
                group.id === action.groupId ? { ...group, ...action.updates } : group
            );
            const idx = updated.findIndex((group) => group.id === action.groupId);

            if (idx !== -1) {
                updated.push(updated.splice(idx, 1)[0]);
            }

            return updated;
        }
        case ActionTypes.Set: {
            return action.state;
        }
        case ActionTypes.Add: {
            return state.concat(action.toAdd);
        }
        case ActionTypes.Copy: {
            const toCopy = state.find((group) => group.id === action.id);

            if (!toCopy) {
                return state;
            }

            let copyNumber = 1;
            let name = `${toCopy.name} - COPY ${copyNumber}`;
            let runLoop = state.find((group) => group.name === name) !== undefined;

            while (runLoop) {
                const newName = `${toCopy.name} - COPY ${++copyNumber}`;
                name = newName;
                runLoop = state.find((group) => group.name === newName) !== undefined;
            }

            const copy = {
                name,
                id: window.crypto.randomUUID(),
                grouping: toCopy.grouping,
                search: toCopy.search ? [...toCopy.search] : [],
                ids: new Set<number>(),
                color: [...toCopy.color] as ObjectGroup["color"],
                status: GroupStatus.None,
                opacity: toCopy.opacity ?? 1,
                includeDescendants: toCopy.includeDescendants ?? true,
            };

            return state.concat(copy);
        }
        case ActionTypes.GroupSelected: {
            let collectionNumber = 1;
            let name = `Collection ${collectionNumber}`;
            let runLoop = state.find((group) => group.grouping === name) !== undefined;

            while (runLoop) {
                const newName = `Collection ${++collectionNumber}`;
                name = newName;
                runLoop = state.find((group) => group.grouping === newName) !== undefined;
            }

            return state.map((group) => {
                if (group.grouping || group.status !== GroupStatus.Selected) {
                    return group;
                }

                return {
                    ...group,
                    grouping: name,
                };
            });
        }
        case ActionTypes.Reset: {
            return state
                .filter((group) => !isInternalTemporaryGroup(group))
                .map((group) => ({ ...group, status: GroupStatus.None }));
        }
        default: {
            throw new Error(`Unhandled action type`);
        }
    }
}

function isInternalTemporaryGroup(group: ObjectGroup): boolean {
    return Boolean(group.grouping?.startsWith("NOVORENDER_INTERNAL_TMP"));
}

export function isInternalGroup(group: ObjectGroup): boolean {
    return Boolean(group.grouping?.startsWith("NOVORENDER_INTERNAL"));
}
