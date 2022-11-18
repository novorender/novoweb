import { vec3 } from "gl-matrix";
import { ManholeMeasureValues, MeasureSettings } from "@novorender/measure-api";
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
    measureAgainst: undefined as undefined | { selected: SelectedMeasureObj; entity?: any },
};

type State = typeof initialState;

export const manholeSlice = createSlice({
    name: "manhole",
    initialState: initialState,
    reducers: {
        selectObj: (state, action: PayloadAction<{ id: number; pos: vec3 } | undefined>) => {
            if (state.pinned) {
                state.measureAgainst = action.payload ? { selected: action.payload } : undefined;
            } else {
                state.selectedId = action.payload?.id;
                state.measureAgainst = undefined;
            }
        },
        initFromBookmark: (state, action: PayloadAction<Bookmark["manhole"]>) => {
            if (!action.payload) {
                return initialState;
            }

            state.selectedId = action.payload.id;
            state.measureAgainst = action.payload.collisionTarget ? action.payload.collisionTarget : undefined;
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
        setMeasureAgainstEntity: (state, action: PayloadAction<NonNullable<State["measureAgainst"]>["entity"]>) => {
            if (state.measureAgainst) {
                state.measureAgainst.entity = action.payload;
            }
        },
        setMeasureAgainstSettings: (state, action: PayloadAction<MeasureSettings>) => {
            if (state.measureAgainst) {
                state.measureAgainst = {
                    selected: { ...state.measureAgainst.selected, settings: action.payload },
                };
            }
        },
    },
});

export const selectManholeId = (state: RootState) => state.manhole.selectedId;
export const selectManholeMeasureValues = (state: RootState) => state.manhole.measureValues;
export const selectManholeMeasureAgainst = (state: RootState) => state.manhole.measureAgainst;
export const selectCollisionValues = (state: RootState) => state.manhole.collisionValues;
export const selectIsLoadingManholeBrep = (state: RootState) => state.manhole.loadingBrep;
export const selectIsManholePinned = (state: RootState) => state.manhole.pinned;

const { actions, reducer } = manholeSlice;
export { actions as manholeActions, reducer as manholeReducer };
