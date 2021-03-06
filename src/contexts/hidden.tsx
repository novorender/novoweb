import { ObjectId } from "@novorender/webgl-api";
import { createContext, Dispatch, ReactNode, useContext, useEffect, useReducer, useRef, useState } from "react";

import { toIdObj, toIdArr } from "utils/objectData";

const initialState = {
    ids: {} as Record<ObjectId, true | undefined>,
    idArr: [] as ObjectId[],
};

type State = typeof initialState;

enum ActionTypes {
    Add,
    Remove,
    SetIds,
}

function add(ids: State["idArr"]) {
    return {
        type: ActionTypes.Add as const,
        ids,
    };
}

function remove(ids: State["idArr"]) {
    return {
        type: ActionTypes.Remove as const,
        ids,
    };
}

function setIds(ids: State["idArr"]) {
    return {
        type: ActionTypes.SetIds as const,
        ids,
    };
}

const actions = { add, remove, setIds };

type Actions = ReturnType<typeof actions[keyof typeof actions]>;
type DispatchHidden = Dispatch<Actions>;

const StateContext = createContext<State>(undefined as any);
const DispatchContext = createContext<DispatchHidden>(undefined as any);

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
        case ActionTypes.SetIds: {
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

function HiddenProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    return (
        <StateContext.Provider value={state}>
            <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
        </StateContext.Provider>
    );
}

function useHidden(): State {
    const context = useContext(StateContext);

    if (context === undefined) {
        throw new Error("useHidden must be used within a HiddenProvider");
    }

    return context;
}

function useLazyHidden() {
    const state = useHidden();
    const ref = useRef(state);

    useEffect(() => {
        ref.current = state;
    }, [state]);

    return ref;
}

function useDispatchHidden(): DispatchHidden {
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
        setIsHidden(hidden[id] === true);
    }, [id, hidden]);

    return isHidden;
}

export { HiddenProvider, useHidden, useLazyHidden, useDispatchHidden, useIsHidden, actions as hiddenGroupActions };
export type { DispatchHidden };
