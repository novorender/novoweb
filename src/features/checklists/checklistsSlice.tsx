import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";

import { getChecklistInstances, getChecklists } from "./utils";

const initialState = {
    lastViewedPath: "/",
    checklists: getChecklists(),
    checklistInstances: getChecklistInstances(),
};

type State = typeof initialState;

export const checklistsSlice = createSlice({
    name: "checklists",
    initialState: initialState,
    reducers: {
        setLastViewedPath: (state, action: PayloadAction<State["lastViewedPath"]>) => {
            state.lastViewedPath = action.payload;
        },
        setChecklists: (state, action: PayloadAction<State["checklists"]>) => {
            state.checklists = action.payload;
        },
        setChecklistInstances: (state, action: PayloadAction<State["checklistInstances"]>) => {
            state.checklistInstances = action.payload;
        },
    },
});

export const selectLastViewedPath = (state: RootState) => state.checklists.lastViewedPath;
export const selectChecklists = (state: RootState) => state.checklists.checklists;
export const selectChecklistInstances = (state: RootState) => state.checklists.checklistInstances;

export const selectChecklistById = createSelector([selectChecklists, (_state, id: string) => id], (checklists, id) =>
    checklists.find((checklist) => checklist.id === id)
);

export const selectInstanceByChecklistId = createSelector(
    [selectChecklistInstances, (_state, id: string) => id],
    (instances, checklistId) => instances.filter((instance) => instance.checklistId === checklistId)
);

export const selectInstanceById = createSelector(
    [selectChecklistInstances, (_state, id: string) => id],
    (instances, id) => instances.find((instance) => instance.id === id)
);

const { actions, reducer } = checklistsSlice;
export { actions as checklistsActions, reducer as checklistsReducer };
