import { createContext, Dispatch, ReactNode, useContext, useEffect, useReducer, useState } from "react";

// Highlighted/hidden/objectgroups may end up having huge (1M+) collections of objectIds and receive a lot of back-to-back state updates.
// Keeping this state in the redux store ended up slowing down the app too much so we keep it in React contexts instead for now.

const initialState = {
    ids: [] as number[],
    color: [1, 0, 0] as [number, number, number],
};

type State = typeof initialState;

enum ActionTypes {
    Add,
    Remove,
    SetIds,
    SetColor,
    Set,
}

function add(ids: State["ids"]) {
    return {
        type: ActionTypes.Add as const,
        ids,
    };
}

function remove(ids: State["ids"]) {
    return {
        type: ActionTypes.Remove as const,
        ids,
    };
}

function setIds(ids: State["ids"]) {
    return {
        type: ActionTypes.SetIds as const,
        ids,
    };
}

function setColor(color: State["color"]) {
    return {
        type: ActionTypes.SetColor as const,
        color,
    };
}

function set(state: State) {
    return {
        type: ActionTypes.Set as const,
        state,
    };
}

const actions = { add, remove, setIds, setColor, set };

type Actions = ReturnType<typeof actions[keyof typeof actions]>;

const StateContext = createContext<State>(undefined as any);
const DispatchContext = createContext<Dispatch<Actions>>(undefined as any);

function reducer(state: State, action: Actions) {
    switch (action.type) {
        case ActionTypes.Add: {
            return {
                color: state.color,
                ids: state.ids.concat(action.ids),
            };
        }
        case ActionTypes.Remove: {
            return {
                color: state.color,
                ids: state.ids.filter((id) => !action.ids.includes(id)),
            };
        }
        case ActionTypes.SetIds: {
            return {
                color: state.color,
                ids: action.ids,
            };
        }
        case ActionTypes.SetColor: {
            return {
                color: action.color,
                ids: state.ids,
            };
        }
        case ActionTypes.Set: {
            return { ...action.state };
        }
        default: {
            throw new Error(`Unhandled action type`);
        }
    }
}

function HighlightedProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    if (window.Cypress) {
        window.contexts = { ...window.contexts, highlighted: { state, dispatch } };
    }

    return (
        <StateContext.Provider value={state}>
            <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
        </StateContext.Provider>
    );
}

function useHighlighted() {
    const context = useContext(StateContext);

    if (context === undefined) {
        throw new Error("useHighlighted must be used within a HighlightedProvider");
    }

    return context;
}

function useDispatchHighlighted() {
    const context = useContext(DispatchContext);

    if (context === undefined) {
        throw new Error("useDispatchHighlighted must be used within a HighlightedProvider");
    }

    return context;
}

function useIsHighlighted(id: number) {
    const [isHighlighted, setIsHighlighted] = useState(false);
    const { ids: highlighted } = useHighlighted();

    useEffect(() => {
        setIsHighlighted(highlighted.includes(id));
    }, [id, highlighted]);

    return isHighlighted;
}

export { HighlightedProvider, useIsHighlighted, useHighlighted, useDispatchHighlighted, actions as highlightActions };
