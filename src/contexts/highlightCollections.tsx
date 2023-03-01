import { ObjectId } from "@novorender/webgl-api";
import { createContext, Dispatch, MutableRefObject, ReactNode, useContext, useReducer, useRef } from "react";

import { VecRGB, VecRGBA } from "utils/color";
import { toIdObj, toIdArr } from "utils/objectData";

export enum HighlightCollection {
    SecondaryHighlight = "secondaryHighlight",
}

const initialState = {
    [HighlightCollection.SecondaryHighlight]: {
        ids: {} as Record<ObjectId, true | undefined>,
        idArr: [] as ObjectId[],
        color: [1, 1, 0, 1] as VecRGB | VecRGBA,
    },
};

type State = typeof initialState;
type Key = keyof State;

enum ActionTypes {
    Add,
    Remove,
    SetIds,
    SetColor,
    Set,
    ClearAll,
}

function add(collection: Key, ids: ObjectId[]) {
    return {
        type: ActionTypes.Add as const,
        collection,
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

const actions = { add, remove, setIds, setColor, set, clearAll };

type Actions = ReturnType<(typeof actions)[keyof typeof actions]>;
type DispatchHighlightCollection = Dispatch<Actions>;
type LazyState = MutableRefObject<State>;

const StateContext = createContext<State>(undefined as any);
const LazyStateContext = createContext<LazyState>(undefined as any);
const DispatchContext = createContext<DispatchHighlightCollection>(undefined as any);

function reducer(state: State, action: Actions): State {
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
            };
        }
        default: {
            throw new Error(`Unhandled action type`);
        }
    }
}

function HighlightCollectionsProvider({ children }: { children: ReactNode }) {
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

function useHighlightCollections(): State {
    const context = useContext(StateContext);

    if (context === undefined) {
        throw new Error("useHighlightCollection must be used within a HighlightCollectionProvider");
    }

    return context;
}

function useLazyHighlightCollections(): LazyState {
    const context = useContext(LazyStateContext);

    if (context === undefined) {
        throw new Error("useLazyHighlightCollection must be used within a LazyHighlightCollectionProvider");
    }

    return context;
}

function useDispatchHighlightCollections(): DispatchHighlightCollection {
    const context = useContext(DispatchContext);

    if (context === undefined) {
        throw new Error("useDispatchHighlightCollection must be used within a HighlightCollectionProvider");
    }

    return context;
}

export {
    HighlightCollectionsProvider,
    useHighlightCollections,
    useLazyHighlightCollections,
    useDispatchHighlightCollections,
    actions as highlightCollectionsActions,
};
export type { DispatchHighlightCollection };
