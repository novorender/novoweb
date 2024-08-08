import { PickSampleExt } from "@novorender/api";
import { createContext, Dispatch, MutableRefObject } from "react";

export type State = PickSampleExt | null;

export const initialState: State = null;

enum ActionTypes {
    Set,
    SetPositionAtCursor,
}

function set(state: null | PickSampleExt) {
    return {
        type: ActionTypes.Set as const,
        state,
    };
}

export const actions = { set };

type Actions = ReturnType<(typeof actions)[keyof typeof actions]>;
export type DispatchLastPickSample = Dispatch<Actions>;
export type LazyContextType = MutableRefObject<State>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StateContext = createContext<State>(undefined as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LazyStateContext = createContext<LazyContextType>(undefined as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DispatchContext = createContext<DispatchLastPickSample>(undefined as any);
export function reducer(state: State, action: Actions): State {
    switch (action.type) {
        case ActionTypes.Set: {
            return action.state;
        }
        default: {
            throw new Error(`Unhandled action type`);
        }
    }
}
