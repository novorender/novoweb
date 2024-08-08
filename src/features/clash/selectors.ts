import { type RootState } from "app";

export const selectSelectedClash = (state: RootState) => state.clash.selectedClash;
