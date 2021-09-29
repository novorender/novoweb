import { ObjectGroup } from "@novorender/data-js-api";
import { createContext, Dispatch, ReactNode, useContext, useReducer } from "react";

export interface CustomGroup extends ObjectGroup {
    ids: number[];
    color: [number, number, number];
}

const initialState = [] as CustomGroup[];

type State = typeof initialState;

enum ActionTypes {
    UpdateGroup,
    Set,
}

function updateGroup(groupId: string, updates: Partial<CustomGroup>) {
    return {
        type: ActionTypes.UpdateGroup as const,
        groupId,
        updates,
    };
}

function set(state: State) {
    return {
        type: ActionTypes.Set as const,
        state,
    };
}

const actions = { updateGroup, set };

type Actions = ReturnType<typeof actions[keyof typeof actions]>;
type ContextType = { state: State; dispatch: Dispatch<Actions> };

const Context = createContext<ContextType>(undefined as any);

function reducer(state: State, action: Actions) {
    switch (action.type) {
        case ActionTypes.UpdateGroup: {
            return state.map((group) => (group.id === action.groupId ? { ...group, ...action.updates } : group));
        }
        case ActionTypes.Set: {
            return action.state;
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

function useCustomGroups() {
    const context = useContext(Context);
    if (context === undefined) {
        throw new Error("useCustomGroups must be used within a CustomGroupsProvider");
    }
    return context;
}

export { CustomGroupsProvider, useCustomGroups, actions as customGroupsActions };
