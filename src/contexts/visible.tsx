import { ObjectId } from "@novorender/webgl-api";
import { createContext, Dispatch, ReactNode, useContext, useReducer } from "react";

import { toIdObj, toIdArr } from "utils/objectData";

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

const StateContext = createContext<State>(undefined as any);
const DispatchContext = createContext<Dispatch<Actions>>(undefined as any);

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

    if (window.Cypress) {
        window.contexts = { ...window.contexts, visible: { state, dispatch } };
    }

    return (
        <StateContext.Provider value={state}>
            <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
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

function useDispatchVisible(): Dispatch<Actions> {
    const context = useContext(DispatchContext);

    if (context === undefined) {
        throw new Error("useDispatchVisible must be used within a VisibleProvider");
    }

    return context;
}

export { VisibleProvider, useVisible, useDispatchVisible, actions as visibleActions };
