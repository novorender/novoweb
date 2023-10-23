import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";

const initialState = {
    scenes: {} as {
        [parentSceneId: string]: {
            id: string;
            name: string;
            status: string;
            progress: string;
            lastSync: string;
            size: number;
            viewerScenes: {
                id: string;
                name: string;
                lastSynced: string;
            }[];
        };
    },
    action: undefined as undefined | { id?: string; action: "delete" | "fullSync" | "incrementalSync" | "pause" },
};

type State = typeof initialState;

export const offlineSlice = createSlice({
    name: "offline",
    initialState: initialState,
    reducers: {
        setAction: (state, action: PayloadAction<State["action"]>) => {
            state.action = action.payload;
        },
        addScene: (state, { payload: scene }: PayloadAction<State["scenes"][string]>) => {
            state.scenes[scene.id] = scene;
        },
        updateScene: (
            state,
            { payload: { id, updates } }: PayloadAction<{ id: string; updates: Partial<State["scenes"][string]> }>
        ) => {
            const scene = state.scenes[id];
            if (scene) {
                state.scenes[id] = {
                    ...scene,
                    ...updates,
                };
            }
        },
        removeScene: (state, action: PayloadAction<string>) => {
            delete state.scenes[action.payload];
        },
    },
});

export const selectOfflineAction = (state: RootState) => state.offline.action;
export const selectOfflineScenes = (state: RootState) => state.offline.scenes;

const { actions, reducer } = offlineSlice;
export { actions as offlineActions, reducer as offlineReducer };
