import { ObjectId } from "@novorender/webgl-api";
import { createContext, Dispatch, MutableRefObject } from "react";

import { VecRGBA } from "utils/color";

import { toIdArr, toIdObj } from "../utils";

// Highlighted/hidden/objectgroups may end up having huge (1M+) collections of objectIds and receive a lot of back-to-back state updates.
// Keeping this state in the redux store ended up slowing down the app too much so we keep it in React contexts instead for now.

export const initialState = {
    ids: {} as Record<ObjectId, true | undefined>,
    idArr: [] as ObjectId[],
    color: [1, 0, 0, 1] as VecRGBA,
};

export type State = typeof initialState;

enum ActionTypes {
    Add,
    Remove,
    SetIds,
    SetColor,
    ResetColor,
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

function resetColor() {
    return {
        type: ActionTypes.ResetColor as const,
    };
}

function set(payload: { color: State["color"]; ids: ObjectId[] }) {
    return {
        type: ActionTypes.Set as const,
        payload,
    };
}

export const actions = { add, remove, setIds, setColor, resetColor, set };

type Actions = ReturnType<(typeof actions)[keyof typeof actions]>;
export type DispatchHighlighted = Dispatch<Actions>;
export type LazyState = MutableRefObject<State>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StateContext = createContext<State>(undefined as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LazyStateContext = createContext<LazyState>(undefined as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DispatchContext = createContext<DispatchHighlighted>(undefined as any);

export function reducer(state: State, action: Actions): State {
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
        case ActionTypes.ResetColor: {
            return {
                color: initialState.color,
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
