import { ReadonlyVec3 } from "gl-matrix";
import { createContext, Dispatch, MutableRefObject, SetStateAction } from "react";

import { FormTransform } from "../types";

export const initialState = {
    objectIdToFormIdMap: new Map<number, { templateId: string; formId: string }>(),
    // Transform of the currently edited form.
    // I don't overwrite transform in original form to support easy reset.
    // And passing it to canvas via context is seemingly more performant.
    transformDraft: undefined as FormTransform | undefined,
};

export type State = typeof initialState;

enum ActionType {
    SetObjectIdToFormIdMap,
    SetTransformDraft,
    SetTransformDraftLocation,
}

function setObjectIdToFormIdMap(value: State["objectIdToFormIdMap"]) {
    return {
        type: ActionType.SetObjectIdToFormIdMap as const,
        value,
    };
}

function setTransformDraft(value: State["transformDraft"]) {
    return {
        type: ActionType.SetTransformDraft as const,
        value,
    };
}

function setTransformDraftLocation(value: ReadonlyVec3) {
    return {
        type: ActionType.SetTransformDraftLocation as const,
        value,
    };
}

export const actions = { setObjectIdToFormIdMap, setTransformDraft, setTransformDraftLocation };

export type ContextType = {
    state: State;
    setState: Dispatch<SetStateAction<State>>;
};

type Actions = ReturnType<(typeof actions)[keyof typeof actions]>;
export type DispatchFormsGlobals = Dispatch<Actions>;
export type LazyContextType = MutableRefObject<State>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StateContext = createContext<State>(undefined as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LazyStateContext = createContext<LazyContextType>(undefined as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DispatchContext = createContext<DispatchFormsGlobals>(undefined as any);

export function reducer(state: State, action: Actions): State {
    switch (action.type) {
        case ActionType.SetObjectIdToFormIdMap: {
            return { ...state, objectIdToFormIdMap: action.value };
        }
        case ActionType.SetTransformDraft: {
            return { ...state, transformDraft: action.value };
        }
        case ActionType.SetTransformDraftLocation: {
            if (!state.transformDraft) {
                return state;
            }

            return {
                ...state,
                transformDraft: {
                    ...state.transformDraft,
                    location: action.value,
                    updated: true,
                },
            };
        }
    }
}
