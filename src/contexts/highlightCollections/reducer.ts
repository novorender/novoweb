import { ObjectId } from "@novorender/webgl-api";
import { createContext, Dispatch, MutableRefObject } from "react";

import { VecRGBA } from "utils/color";

import { toIdArr, toIdObj } from "../utils";

export enum HighlightCollection {
    SecondaryHighlight = "secondaryHighlight",
    FormsNew = "formsNew",
    FormsOngoing = "formsOngoing",
    FormsCompleted = "formsCompleted",
    ClashObjects1 = "clashObjects1",
    ClashObjects2 = "clashObjects2",
}

export const initialState = {
    [HighlightCollection.SecondaryHighlight]: {
        ids: {} as Record<ObjectId, true | undefined>,
        idArr: [] as ObjectId[],
        color: [1, 1, 0, 1] as VecRGBA,
    },
    [HighlightCollection.FormsNew]: {
        ids: {} as Record<ObjectId, true | undefined>,
        idArr: [] as ObjectId[],
        color: [0.5, 0, 0, 1] as VecRGBA,
    },
    [HighlightCollection.FormsOngoing]: {
        ids: {} as Record<ObjectId, true | undefined>,
        idArr: [] as ObjectId[],
        color: [1, 0.75, 0, 1] as VecRGBA,
    },
    [HighlightCollection.FormsCompleted]: {
        ids: {} as Record<ObjectId, true | undefined>,
        idArr: [] as ObjectId[],
        color: [0, 0.5, 0, 1] as VecRGBA,
    },
    [HighlightCollection.ClashObjects1]: {
        ids: {} as Record<ObjectId, true | undefined>,
        idArr: [] as ObjectId[],
        color: [1, 0, 0, 1] as VecRGBA,
    },
    [HighlightCollection.ClashObjects2]: {
        ids: {} as Record<ObjectId, true | undefined>,
        idArr: [] as ObjectId[],
        color: [0, 0, 1, 1] as VecRGBA,
    },
};

export type State = typeof initialState;
type Key = keyof State;

enum ActionTypes {
    Add,
    Move,
    Remove,
    SetIds,
    SetColor,
    Set,
    ClearAll,
    ClearForms,
}

function add(collection: Key, ids: ObjectId[]) {
    return {
        type: ActionTypes.Add as const,
        collection,
        ids,
    };
}

function move(fromCollection: Key, toCollection: Key, ids: ObjectId[]) {
    return {
        type: ActionTypes.Move as const,
        fromCollection,
        toCollection,
        ids,
    };
}

function remove(collection: Key, ids: ObjectId[]) {
    return {
        type: ActionTypes.Remove as const,
        collection,
        ids,
    };
}

function setIds(collection: Key, ids: ObjectId[]) {
    return {
        type: ActionTypes.SetIds as const,
        collection,
        ids,
    };
}

function setColor(collection: Key, color: State[Key]["color"]) {
    return {
        type: ActionTypes.SetColor as const,
        collection,
        color,
    };
}

function set(collection: Key, payload: { color: State[Key]["color"]; ids: ObjectId[] }) {
    return {
        type: ActionTypes.Set as const,
        collection,
        payload,
    };
}

function clearAll() {
    return {
        type: ActionTypes.ClearAll as const,
    };
}

function clearForms() {
    return {
        type: ActionTypes.ClearForms as const,
    };
}

export const actions = { add, move, remove, setIds, setColor, set, clearAll, clearForms };

type Actions = ReturnType<(typeof actions)[keyof typeof actions]>;
export type DispatchHighlightCollection = Dispatch<Actions>;
export type LazyState = MutableRefObject<State>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StateContext = createContext<State>(undefined as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LazyStateContext = createContext<LazyState>(undefined as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DispatchContext = createContext<DispatchHighlightCollection>(undefined as any);

export function reducer(state: State, action: Actions): State {
    switch (action.type) {
        case ActionTypes.Add: {
            const collection = state[action.collection];
            const ids = { ...collection.ids, ...toIdObj(action.ids) };

            return {
                ...state,
                [action.collection]: {
                    ...collection,
                    ids,
                },
            };
        }
        case ActionTypes.Move: {
            const fromCollection = state[action.fromCollection];

            action.ids.forEach((id) => {
                delete fromCollection.ids[id];
            });

            const toCollection = state[action.toCollection];
            const ids = { ...toCollection.ids, ...toIdObj(action.ids) };

            return {
                ...state,
                [action.fromCollection]: {
                    ...fromCollection,
                    idArr: toIdArr(fromCollection.ids),
                },
                [action.toCollection]: {
                    ...toCollection,
                    ids,
                    idArr: toIdArr(ids),
                },
            };
        }
        case ActionTypes.Remove: {
            const collection = state[action.collection];

            action.ids.forEach((id) => {
                delete collection.ids[id];
            });

            return {
                ...state,
                [action.collection]: {
                    ...collection,
                    idArr: toIdArr(collection.ids),
                },
            };
        }
        case ActionTypes.SetIds: {
            const collection = state[action.collection];

            return {
                ...state,
                [action.collection]: {
                    ...collection,
                    ids: toIdObj(action.ids),
                    idArr: action.ids,
                },
            };
        }
        case ActionTypes.SetColor: {
            const collection = state[action.collection];

            return {
                ...state,
                [action.collection]: {
                    ...collection,
                    color: action.color,
                },
            };
        }
        case ActionTypes.Set: {
            return {
                ...state,
                [action.collection]: {
                    color: action.payload.color,
                    idArr: action.payload.ids,
                    ids: toIdObj(action.payload.ids),
                },
            };
        }
        case ActionTypes.ClearAll: {
            return {
                ...state,
                [HighlightCollection.SecondaryHighlight]: {
                    color: state.secondaryHighlight.color,
                    idArr: [],
                    ids: {},
                },
                [HighlightCollection.FormsNew]: {
                    color: state.formsNew.color,
                    idArr: [],
                    ids: {},
                },
                [HighlightCollection.FormsOngoing]: {
                    color: state.formsOngoing.color,
                    idArr: [],
                    ids: {},
                },
                [HighlightCollection.FormsCompleted]: {
                    color: state.formsCompleted.color,
                    idArr: [],
                    ids: {},
                },
            };
        }
        case ActionTypes.ClearForms: {
            return {
                ...state,
                [HighlightCollection.FormsNew]: {
                    color: state.formsNew.color,
                    idArr: [],
                    ids: {},
                },
                [HighlightCollection.FormsOngoing]: {
                    color: state.formsOngoing.color,
                    idArr: [],
                    ids: {},
                },
                [HighlightCollection.FormsCompleted]: {
                    color: state.formsCompleted.color,
                    idArr: [],
                    ids: {},
                },
            };
        }
        default: {
            throw new Error(`Unhandled action type`);
        }
    }
}
