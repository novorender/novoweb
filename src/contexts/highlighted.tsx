import { ObjectId } from "@novorender/webgl-api";
import { createContext, Dispatch, ReactNode, useContext, useEffect, useReducer, useRef, useState } from "react";

import { toIdObj, toIdArr } from "utils/objectData";

// Highlighted/hidden/objectgroups may end up having huge (1M+) collections of objectIds and receive a lot of back-to-back state updates.
// Keeping this state in the redux store ended up slowing down the app too much so we keep it in React contexts instead for now.

const initialState = {
    ids: {} as Record<ObjectId, true | undefined>,
    idArr: [] as ObjectId[],
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

function add(ids: ObjectId[]) {
    return {
        type: ActionTypes.Add as const,
        ids,
    };
}

function remove(ids: ObjectId[]) {
    return {
        type: ActionTypes.Remove as const,
        ids,
    };
}

function setIds(ids: ObjectId[]) {
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

function set(payload: { color: State["color"]; ids: ObjectId[] }) {
    return {
        type: ActionTypes.Set as const,
        payload,
    };
}

const actions = { add, remove, setIds, setColor, set };

type Actions = ReturnType<typeof actions[keyof typeof actions]>;

const StateContext = createContext<State>(undefined as any);
const DispatchContext = createContext<Dispatch<Actions>>(undefined as any);

function reducer(state: State, action: Actions): State {
    switch (action.type) {
        case ActionTypes.Add: {
            const ids = { ...state.ids, ...toIdObj(action.ids) };

            return {
                ids,
                idArr: toIdArr(ids),
                color: state.color,
            };
        }
        case ActionTypes.Remove: {
            action.ids.forEach((id) => {
                delete state.ids[id];
            });

            return {
                color: state.color,
                ids: { ...state.ids },
                idArr: toIdArr(state.ids),
            };
        }
        case ActionTypes.SetIds: {
            return {
                color: state.color,
                ids: toIdObj(action.ids),
                idArr: action.ids,
            };
        }
        case ActionTypes.SetColor: {
            return {
                color: action.color,
                ids: state.ids,
                idArr: state.idArr,
            };
        }
        case ActionTypes.Set: {
            return {
                color: action.payload.color,
                ids: toIdObj(action.payload.ids),
                idArr: action.payload.ids,
            };
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

function useHighlighted(): State {
    const context = useContext(StateContext);

    if (context === undefined) {
        throw new Error("useHighlighted must be used within a HighlightedProvider");
    }

    return context;
}

function useLazyHighlighted() {
    const state = useHighlighted();
    const ref = useRef(state);

    useEffect(() => {
        ref.current = state;
    }, [state]);

    return ref;
}

function useDispatchHighlighted(): Dispatch<Actions> {
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
        setIsHighlighted(highlighted[id] === true);
    }, [id, highlighted]);

    return isHighlighted;
}

export {
    HighlightedProvider,
    useIsHighlighted,
    useHighlighted,
    useLazyHighlighted,
    useDispatchHighlighted,
    actions as highlightActions,
};
