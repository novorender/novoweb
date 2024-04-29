import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { type RootState } from "app";

const initialState = {
    scenes: {} as {
        [parentSceneId: string]: {
            id: string;
            name: string;
            status: string;
            progress: string;
            scanProgress: string;
            lastSync: string;
            size: number;
            error?: string;
            viewerScenes: {
                id: string;
                name: string;
                lastSynced: string;
            }[];
        };
    },
    action: undefined as
        | undefined
        | { id?: string; action: "delete" | "estimate" | "fullSync" | "incrementalSync" | "pause" | "readSize" },
    sizeWarning: undefined as
        | undefined
        | {
              totalSize: number;
              usedSize: number;
              availableSize: number;
          },
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
        setSizeWarning: (state, action: PayloadAction<State["sizeWarning"]>) => {
            state.sizeWarning = action.payload;
        },
    },
});

export const selectOfflineAction = (state: RootState) => state.offline.action;
export const selectOfflineScenes = (state: RootState) => state.offline.scenes;
export const selectSizeWarning = (state: RootState) => state.offline.sizeWarning;

const { actions, reducer } = offlineSlice;
export { actions as offlineActions, reducer as offlineReducer };
