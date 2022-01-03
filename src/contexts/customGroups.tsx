import { ObjectGroup } from "@novorender/data-js-api";
import { createContext, Dispatch, ReactNode, useContext, useReducer } from "react";

export interface CustomGroup extends ObjectGroup {
    ids: number[];
    color: [number, number, number];
}

const initialState = [] as CustomGroup[];

type State = typeof initialState;

enum ActionTypes {
    Update,
    Set,
    Add,
    Delete,
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

function add(group: CustomGroup) {
    return {
        type: ActionTypes.Add as const,
        group,
    };
}

const actions = { set, add, update, delete: deleteGroup };

type Actions = ReturnType<typeof actions[keyof typeof actions]>;
type DispatchCustomGroups = Dispatch<Actions>;
type ContextType = { state: State; dispatch: DispatchCustomGroups };

const Context = createContext<ContextType>(undefined as any);

function reducer(state: State, action: Actions) {
    switch (action.type) {
        case ActionTypes.Delete: {
            return state.filter((group) => group.id !== action.groupId);
        }
        case ActionTypes.Update: {
            return state.map((group) => (group.id === action.groupId ? { ...group, ...action.updates } : group));
        }
        case ActionTypes.Set: {
            return action.state;
        }
        case ActionTypes.Add: {
            return [...state, action.group];
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

export { CustomGroupsProvider, useCustomGroups, actions as customGroupsActions };
export type { DispatchCustomGroups };
