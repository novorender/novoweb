import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";

export type Road = {
    id: number;
    name: string;
};

const initialState = {
    roadId: undefined as undefined | string,
    roads: { status: AsyncStatus.Initial } as AsyncState<Road[]>,
};

type State = typeof initialState;

export const roadProfileSlice = createSlice({
    name: "roadProfile",
    initialState: initialState,
    reducers: {
        setRoadId: (state, action: PayloadAction<State["roadId"]>) => {
            state.roadId = action.payload;
        },
        setRoads: (state, action: PayloadAction<State["roads"]>) => {
            state.roads = action.payload;
        },
    },
});

export const selectRoadId = (state: RootState) => state.roadProfile.roadId;
export const selectAvailableRoads = (state: RootState) => state.roadProfile.roads;

const { actions, reducer } = roadProfileSlice;
export { actions as roadProfileActions, reducer as roadProfileReducer };
