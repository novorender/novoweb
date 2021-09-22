import { createContext, Dispatch, ReactNode, useContext, useEffect, useReducer, useState } from "react";

const initialState = {
    ids: [] as number[],
    color: [1, 0, 0] as [number, number, number],
};

type State = typeof initialState;

enum ActionTypes {
    AddToGroup,
    RemoveFromGroup,
    OverwriteIds,
    SetColor,
    SetGroup,
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

function setColor(color: State["color"]) {
    return {
        type: ActionTypes.SetColor as const,
        color,
    };
}

function setGroup(state: State) {
    return {
        type: ActionTypes.SetGroup as const,
        state,
    };
}

const actions = { addToGroup, removeFromGroup, overwriteIds, setColor, setGroup };

type Actions = ReturnType<typeof actions[keyof typeof actions]>;

const StateContext = createContext<State>(undefined as any);
const DispatchContext = createContext<Dispatch<Actions>>(undefined as any);

function reducer(state: State, action: Actions) {
    switch (action.type) {
        case ActionTypes.AddToGroup: {
            return {
                color: state.color,
                ids: state.ids.concat(action.ids),
            };
        }
        case ActionTypes.RemoveFromGroup: {
            return {
                color: state.color,
                ids: state.ids.filter((id) => !action.ids.includes(id)),
            };
        }
        case ActionTypes.OverwriteIds: {
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
        case ActionTypes.SetGroup: {
            return { ...action.state };
        }
        default: {
            throw new Error(`Unhandled action type`);
        }
    }
}

function HighlightedProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);

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
