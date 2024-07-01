import { createSelector } from "@reduxjs/toolkit";

import { type RootState } from "app";

export const selectOmega365Config = (state: RootState) => state.omega365.config;
export const selectOmega365ConfigDraft = (state: RootState) => state.omega365.configDraft;
export const selectSelectedViewId = (state: RootState) => state.omega365.selectedViewId;
export const selectSelectedView = createSelector([selectOmega365Config, selectSelectedViewId], (config, id) =>
    config?.views.find((v) => v.id === id)
);
export const selectSnackbarMessage = (state: RootState) => state.omega365.snackbarMessage;
