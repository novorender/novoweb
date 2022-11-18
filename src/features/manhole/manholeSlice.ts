import { vec3 } from "gl-matrix";
import { ManholeMeasureValues, MeasureEntity, MeasureSettings } from "@novorender/measure-api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Bookmark } from "@novorender/data-js-api";

import { RootState } from "app/store";
import { SelectedMeasureObj } from "features/measure";

const initialState = {
    selectedId: undefined as number | undefined,
    measureValues: undefined as ManholeMeasureValues | undefined,
    loadingBrep: false,
    pinned: false,
    collisionValues: undefined as undefined | [vec3, vec3],
    collisionTarget: undefined as undefined | { selected: SelectedMeasureObj; entity?: MeasureEntity },
};

type State = typeof initialState;

export const manholeSlice = createSlice({
    name: "manhole",
    initialState: initialState,
    reducers: {
        selectObj: (state, action: PayloadAction<{ id: number; pos: vec3 } | undefined>) => {
            if (state.pinned) {
                state.collisionTarget = action.payload ? { selected: action.payload } : undefined;
            } else {
                state.selectedId = action.payload?.id;
                state.collisionTarget = undefined;
            }
        },
        initFromBookmark: (state, action: PayloadAction<Bookmark["manhole"]>) => {
            if (!action.payload) {
                return initialState;
            }

            state.selectedId = action.payload.id;
            state.collisionTarget = action.payload.collisionTarget ? action.payload.collisionTarget : undefined;
        },
        setManholeValues: (state, action: PayloadAction<State["measureValues"]>) => {
            state.measureValues = action.payload as any;
        },
        setLoadingBrep: (state, action: PayloadAction<State["loadingBrep"]>) => {
            state.loadingBrep = action.payload;
        },
        setPinned: (state, action: PayloadAction<State["pinned"]>) => {
            state.pinned = action.payload;
        },
        setCollisionValues: (state, action: PayloadAction<State["collisionValues"]>) => {
            state.collisionValues = action.payload;
        },
        setCollisionEntity: (state, action: PayloadAction<MeasureEntity | undefined>) => {
            if (state.collisionTarget) {
                state.collisionTarget.entity = action.payload as any;
            }
        },
        setCollisionSettings: (state, action: PayloadAction<MeasureSettings>) => {
            if (state.collisionTarget) {
                state.collisionTarget.selected.settings = action.payload;
            }
        },
    },
});

export const selectManholeId = (state: RootState) => state.manhole.selectedId;
export const selectManholeMeasureValues = (state: RootState) => state.manhole.measureValues;
export const selectManholeCollisionTarget = (state: RootState) => state.manhole.collisionTarget;
export const selectCollisionValues = (state: RootState) => state.manhole.collisionValues;
export const selectIsLoadingManholeBrep = (state: RootState) => state.manhole.loadingBrep;
export const selectIsManholePinned = (state: RootState) => state.manhole.pinned;

const { actions, reducer } = manholeSlice;
export { actions as manholeActions, reducer as manholeReducer };
