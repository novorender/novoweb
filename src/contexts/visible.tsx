import { ObjectId } from "@novorender/webgl-api";
import { createContext, Dispatch, MutableRefObject, ReactNode, useContext, useReducer, useRef } from "react";

import { toIdObj, toIdArr } from "utils/objectData";

// todo rename denne

const initialState = {
    ids: {} as Record<ObjectId, true | undefined>,
    idArr: [] as ObjectId[],
};

type State = typeof initialState;

enum ActionTypes {
    Add,
    Remove,
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

function set(ids: ObjectId[]) {
    return {
        type: ActionTypes.Set as const,
        ids,
    };
}

const actions = { add, remove, set };

type Actions = ReturnType<typeof actions[keyof typeof actions]>;
type DispatchVisible = Dispatch<Actions>;
type LazyState = MutableRefObject<State>;

const StateContext = createContext<State>(undefined as any);
const LazyStateContext = createContext<LazyState>(undefined as any);
const DispatchContext = createContext<DispatchVisible>(undefined as any);

function reducer(state: State, action: Actions): State {
    switch (action.type) {
        case ActionTypes.Add: {
            const ids = { ...state.ids, ...toIdObj(action.ids) };

            return {
                ids,
                idArr: toIdArr(ids),
            };
        }
        case ActionTypes.Remove: {
            action.ids.forEach((id) => {
                delete state.ids[id];
            });

            return {
                ids: { ...state.ids },
                idArr: toIdArr(state.ids),
            };
        }
        case ActionTypes.Set: {
            return {
                ids: toIdObj(action.ids),
                idArr: action.ids,
            };
        }
        default: {
            throw new Error(`Unhandled action type`);
        }
    }
}

function VisibleProvider({ children }: { children: ReactNode }) {
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

function useVisible(): State {
    const context = useContext(StateContext);

    if (context === undefined) {
        throw new Error("useVisible must be used within a VisibleProvider");
    }

    return context;
}

function useLazyVisible(): LazyState {
    const context = useContext(LazyStateContext);

    if (context === undefined) {
        throw new Error("useLazyVisible must be used within a LazyVisibleProvider");
    }

    return context;
}

function useDispatchVisible(): DispatchVisible {
    const context = useContext(DispatchContext);

    if (context === undefined) {
        throw new Error("useDispatchVisible must be used within a VisibleProvider");
    }

    return context;
}

export { VisibleProvider, useVisible, useLazyVisible, useDispatchVisible, actions as visibleActions };
