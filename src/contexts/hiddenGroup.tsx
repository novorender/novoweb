import { createContext, Dispatch, ReactNode, useContext, useEffect, useReducer, useState } from "react";

const initialState = {
    ids: [] as number[],
};

type State = typeof initialState;

enum ActionTypes {
    AddToGroup,
    RemoveFromGroup,
    OverwriteIds,
}

function addToGroup(ids: State["ids"]) {
    return {
        type: ActionTypes.AddToGroup as const,
        ids,
    };
}

function removeFromGroup(ids: State["ids"]) {
    return {
        type: ActionTypes.RemoveFromGroup as const,
        ids,
    };
}

function overwriteIds(ids: State["ids"]) {
    return {
        type: ActionTypes.OverwriteIds as const,
        ids,
    };
}

const actions = { addToGroup, removeFromGroup, overwriteIds };

type Actions = ReturnType<typeof actions[keyof typeof actions]>;

const StateContext = createContext<State>(undefined as any);
const DispatchContext = createContext<Dispatch<Actions>>(undefined as any);

function reducer(state: State, action: Actions) {
    switch (action.type) {
        case ActionTypes.AddToGroup: {
            return {
                ids: state.ids.concat(action.ids),
            };
        }
        case ActionTypes.RemoveFromGroup: {
            return {
                ids: state.ids.filter((id) => !action.ids.includes(id)),
            };
        }
        case ActionTypes.OverwriteIds: {
            return {
                ids: action.ids,
            };
        }
        default: {
            throw new Error(`Unhandled action type`);
        }
    }
}

function HiddenProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    return (
        <StateContext.Provider value={state}>
            <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
        </StateContext.Provider>
    );
}

function useHidden() {
    const context = useContext(StateContext);

    if (context === undefined) {
        throw new Error("useHidden must be used within a HiddenProvider");
    }

    return context;
}

function useDispatchHidden() {
    const context = useContext(DispatchContext);

    if (context === undefined) {
        throw new Error("useDispatchHidden must be used within a HiddenProvider");
    }

    return context;
}

function useIsHidden(id: number) {
    const [isHidden, setIsHidden] = useState(false);
    const { ids: hidden } = useHidden();

    useEffect(() => {
        setIsHidden(hidden.includes(id));
    }, [id, hidden]);

    return isHidden;
}

export { HiddenProvider, useHidden, useDispatchHidden, useIsHidden, actions as hiddenGroupActions };
