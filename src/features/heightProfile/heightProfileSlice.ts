import { MeasureEntity } from "@novorender/api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { type RootState } from "app";
import { DeepMutable } from "features/render";
import { AsyncState, AsyncStatus } from "types/misc";

type SelectedEntity = AsyncState<MeasureEntity | undefined>;
type MutableSelectedEntity = DeepMutable<SelectedEntity>;

const initialState = {
    selectedPoint: undefined as undefined | { pos: vec3; id: number },
    selectedEntity: { status: AsyncStatus.Initial } as MutableSelectedEntity,
    cylindersProfilesFrom: "center" as "center" | "top" | "bottom",
};

type State = typeof initialState;

export const heightProfileSlice = createSlice({
    name: "heightProfile",
    initialState: initialState,
    reducers: {
        selectPoint: (state, action: PayloadAction<State["selectedPoint"]>) => {
            state.selectedPoint = action.payload;
        },
        setSelectedEntity: (state, action: PayloadAction<SelectedEntity>) => {
            state.selectedEntity = action.payload as MutableSelectedEntity;
        },
        setCylindersProfilesFrom: (state, action: PayloadAction<State["cylindersProfilesFrom"]>) => {
            state.cylindersProfilesFrom = action.payload;
        },
    },
});

export const selectSelectedPoint = (state: RootState) => state.heightProfile.selectedPoint;
export const selectCylindersProfilesFrom = (state: RootState) => state.heightProfile.cylindersProfilesFrom;
export const selectHeightProfileMeasureEntity = (state: RootState) =>
    state.heightProfile.selectedEntity as SelectedEntity;

const { actions, reducer } = heightProfileSlice;
export { actions as heightProfileActions, reducer as heightProfileReducer };
