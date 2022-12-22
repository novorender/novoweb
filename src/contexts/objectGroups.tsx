import { ObjectGroup as BaseObjectGroup } from "@novorender/data-js-api";
import { createContext, Dispatch, MutableRefObject, ReactNode, useContext, useReducer, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

import { VecRGB, VecRGBA } from "utils/color";

export interface ObjectGroup extends BaseObjectGroup {
    ids: number[];
    color: VecRGB | VecRGBA;
}

const initialState = [] as ObjectGroup[];

type State = typeof initialState;

export enum InternalGroup {
    Checklist = "NOVORENDER_INTERNAL/Checklists",
}

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

const actions = { update, set, add, copy, reset, groupSelected, delete: deleteGroup };

type Actions = ReturnType<typeof actions[keyof typeof actions]>;
type DispatchObjectGroups = Dispatch<Actions>;
type LazyContextType = MutableRefObject<State>;

const StateContext = createContext<State>(undefined as any);
const LazyStateContext = createContext<LazyContextType>(undefined as any);
const DispatchContext = createContext<DispatchObjectGroups>(undefined as any);

function reducer(state: State, action: Actions): ObjectGroup[] {
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
                id: uuidv4(),
                grouping: toCopy.grouping,
                search: toCopy.search ? [...toCopy.search] : undefined,
                ids: [],
                color: [...toCopy.color] as ObjectGroup["color"],
                selected: false,
                hidden: false,
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
                if (group.grouping || !group.selected) {
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
                .map((group) => ({ ...group, selected: false, hidden: false }));
        }
        default: {
            throw new Error(`Unhandled action type`);
        }
    }
}

function ObjectGroupsProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const lazyValue = useRef(state);
    lazyValue.current = state;

    return (
        <StateContext.Provider value={state}>
            <LazyStateContext.Provider value={lazyValue}>
                <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
            </LazyStateContext.Provider>
        </StateContext.Provider>
    );
}

function useObjectGroups(): State {
    const context = useContext(StateContext);

    if (context === undefined) {
        throw new Error("useObjectGroups must be used within a ObjectGroupsProvider");
    }

    return context;
}

function useLazyObjectGroups(): LazyContextType {
    const context = useContext(LazyStateContext);

    if (context === undefined) {
        throw new Error("useLazyObjectGroups must be used within a ObjectGroupsProvider");
    }

    return context;
}

function useDispatchObjectGroups(): DispatchObjectGroups {
    const context = useContext(DispatchContext);

    if (context === undefined) {
        throw new Error("useDispatchObjectGroups must be used within a ObjectGroupsProvider");
    }

    return context;
}

function isInternalTemporaryGroup(group: ObjectGroup): boolean {
    return Boolean(group.grouping?.startsWith("NOVORENDER_INTERNAL_TMP"));
}

function isInternalGroup(group: ObjectGroup): boolean {
    return Boolean(group.grouping?.startsWith("NOVORENDER_INTERNAL"));
}

export {
    ObjectGroupsProvider,
    useObjectGroups,
    useDispatchObjectGroups,
    useLazyObjectGroups,
    actions as objectGroupsActions,
    isInternalTemporaryGroup,
    isInternalGroup,
};
export type { DispatchObjectGroups };
