import { SceneConfig as OctreeSceneConfig, View } from "@novorender/api";
import { OfflineViewState } from "@novorender/api";
import { ObjectDB } from "@novorender/data-js-api";
import { createContext, Dispatch } from "react";

export const initialState = {
    view: undefined as undefined | View,
    scene: undefined as undefined | OctreeSceneConfig,
    sceneVersion: undefined as undefined | string,
    db: undefined as undefined | ObjectDB,
    canvas: null as null | HTMLCanvasElement,
    size: { width: 0, height: 0 },
    offlineWorkerState: undefined as undefined | OfflineViewState,
};

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

export const actions = { set, update };

type State = typeof initialState;
export type HydratedState = Pick<
    { [K in keyof State]: NonNullable<State[K]> },
    "view" | "scene" | "db" | "canvas" | "offlineWorkerState"
> &
    Omit<State, "view" | "scene" | "db" | "canvas" | "offlineWorkerState">;

export type Actions = ReturnType<(typeof actions)[keyof typeof actions]>;
export type ContextType = { state: State | HydratedState; dispatch: Dispatch<Actions> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Context = createContext<ContextType>(undefined as any);

export function reducer(state: State, action: Actions): State {
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
