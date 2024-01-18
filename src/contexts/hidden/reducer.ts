import { ObjectId } from "@novorender/webgl-api";
import { createContext, Dispatch, MutableRefObject } from "react";

import { toIdArr, toIdObj } from "../utils";

export const initialState = {
    ids: {} as Record<ObjectId, true | undefined>,
    idArr: [] as ObjectId[],
};

export type State = typeof initialState;

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

export const actions = { add, remove, setIds };

type Actions = ReturnType<(typeof actions)[keyof typeof actions]>;
export type DispatchHidden = Dispatch<Actions>;
export type LazyState = MutableRefObject<State>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StateContext = createContext<State>(undefined as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LazyStateContext = createContext<LazyState>(undefined as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DispatchContext = createContext<DispatchHidden>(undefined as any);

export function reducer(state: State, action: Actions): State {
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
