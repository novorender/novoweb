import { ObjectGroup } from "@novorender/data-js-api";
import { createContext, Dispatch, ReactNode, useContext, useReducer } from "react";

export interface CustomGroup extends ObjectGroup {
    ids: number[];
    color: [number, number, number];
}

const initialState = {} as Record<string, CustomGroup>;

type State = typeof initialState;

function updateGroup(groupId: string, updates: Partial<CustomGroup>) {
    return {
        type: "updateGroup" as const,
        groupId,
        updates,
    };
}

function overwriteGroups(state: State) {
    return {
        type: "overwriteGroups" as const,
        state,
    };
}

const actions = { updateGroup, overwriteGroups };

type Actions = ReturnType<typeof actions[keyof typeof actions]>;
type ContextType = { state: State; dispatch: Dispatch<Actions> };

const Context = createContext<ContextType>(undefined as any);

function reducer(state: State, action: Actions) {
    switch (action.type) {
        case "updateGroup": {
            const toUpdate = state[action.groupId];

            if (!toUpdate) {
                throw new Error(`Found no group with id: ${action.groupId}`);
            }

            return {
                ...state,
                [action.groupId]: {
                    ...toUpdate,
                    ...action.updates,
                },
            };
        }
        case "overwriteGroups": {
            return { ...action.state };
        }
        default: {
            throw new Error(`Unhandled action type`);
        }
    }
}

function CustomGroupsProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    const value = { state, dispatch };

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
