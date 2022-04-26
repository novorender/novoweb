import { ObjectGroup } from "@novorender/data-js-api";
import { createContext, Dispatch, ReactNode, useContext, useEffect, useReducer, useRef } from "react";

import { VecRGB, VecRGBA } from "utils/color";

export interface CustomGroup extends ObjectGroup {
    ids: number[];
    color: VecRGB | VecRGBA;
}

const initialState = [] as CustomGroup[];

type State = typeof initialState;

export enum TempGroup {
    BIMcollab = "Temporary BIMcollab viewpoint groups",
}

enum ActionTypes {
    Update,
    Set,
    Add,
    Delete,
    Reset,
}

function update(groupId: string, updates: Partial<CustomGroup>) {
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

const actions = { update, set, add, reset, delete: deleteGroup };

type Actions = ReturnType<typeof actions[keyof typeof actions]>;
type DispatchCustomGroups = Dispatch<Actions>;
type ContextType = { state: State; dispatch: DispatchCustomGroups };

const Context = createContext<ContextType>(undefined as any);

function reducer(state: State, action: Actions): CustomGroup[] {
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
        case ActionTypes.Reset: {
            return state
                .filter((group) => group.grouping !== TempGroup.BIMcollab)
                .map((group) => ({ ...group, selected: false, hidden: false }));
        }
        default: {
            throw new Error(`Unhandled action type`);
        }
    }
}

function CustomGroupsProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    const value = { state, dispatch };

    if (window.Cypress) {
        window.contexts = { ...window.contexts, customGroups: value };
    }

    return <Context.Provider value={value}>{children}</Context.Provider>;
}

function useCustomGroups(): ContextType {
    const context = useContext(Context);

    if (context === undefined) {
        throw new Error("useCustomGroups must be used within a CustomGroupsProvider");
    }

    return context;
}

function useLazyCustomGroups() {
    const state = useCustomGroups();
    const ref = useRef(state.state);

    useEffect(() => {
        ref.current = state.state;
    }, [state]);

    return ref;
}

export { CustomGroupsProvider, useCustomGroups, useLazyCustomGroups, actions as customGroupsActions };
export type { DispatchCustomGroups };
