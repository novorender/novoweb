import { MeasureView, SceneConfig as OctreeSceneConfig, View } from "@novorender/api";
import { OfflineViewState } from "@novorender/api/offline";
import { ObjectDB } from "@novorender/data-js-api";
import { createContext, Dispatch, ReactNode, useContext, useReducer } from "react";

// Values that are used all over the place within Explorer, but are unserializable go here instead of redux store.

const initialState = {
    view: undefined as undefined | View,
    scene: undefined as undefined | OctreeSceneConfig,
    db: undefined as undefined | ObjectDB,
    canvas: null as null | HTMLCanvasElement,
    measureView: undefined as undefined | MeasureView,
    size: { width: 0, height: 0 },
    offlineWorkerState: undefined as undefined | OfflineViewState,
};

type State = typeof initialState;
type HydratedState = Pick<
    { [K in keyof State]: NonNullable<State[K]> },
    "view" | "scene" | "db" | "canvas" | "measureView" | "offlineWorkerState"
> &
    Omit<State, "view" | "scene" | "db" | "canvas" | "measureView" | "offlineWorkerState">;

enum ActionTypes {
    Set,
    Update,
}

function update(updates: Partial<State>) {
    return {
        type: ActionTypes.Update as const,
        updates,
    };
}

function set(state: State) {
    return {
        type: ActionTypes.Set as const,
        state,
    };
}

const actions = { set, update };

type Actions = ReturnType<(typeof actions)[keyof typeof actions]>;
type ContextType = { state: State | HydratedState; dispatch: Dispatch<Actions> };

const Context = createContext<ContextType>(undefined as any);

function reducer(state: State, action: Actions): State {
    switch (action.type) {
        case ActionTypes.Set: {
            return action.state;
        }
        case ActionTypes.Update: {
            return {
                ...state,
                ...action.updates,
            };
        }
        default: {
            throw new Error(`Unhandled action type`);
        }
    }
}

function ExplorerGlobalsProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const value = { state, dispatch };

    return <Context.Provider value={value}>{children}</Context.Provider>;
}

function useExplorerGlobals(expectHydrated: true): { state: HydratedState; dispatch: Dispatch<Actions> };
function useExplorerGlobals(expectHydrated?: false): ContextType;
function useExplorerGlobals(expectHydrated?: boolean): ContextType {
    const context = useContext(Context);

    if (context === undefined) {
        throw new Error("useExplorerGlobals must be used within a ExplorerGlobalsProvider");
    }

    if (
        expectHydrated &&
        [context.state.canvas, context.state.view, context.state.scene, context.state.db].includes(undefined)
    ) {
        throw new Error("useExplorerGlobals(true) must not be used without first loading scene, view and canvas");
    }

    return context;
}

export { ExplorerGlobalsProvider, actions as explorerGlobalsActions, useExplorerGlobals };
