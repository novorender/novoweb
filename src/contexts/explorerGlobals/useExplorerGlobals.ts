import { Dispatch, useContext } from "react";

import { Actions, Context, ContextType, HydratedState } from "./reducer";

export function useExplorerGlobals(expectHydrated: true): { state: HydratedState; dispatch: Dispatch<Actions> };
export function useExplorerGlobals(expectHydrated?: false): ContextType;
export function useExplorerGlobals(expectHydrated?: boolean): ContextType {
    const context = useContext(Context);

    if (context === undefined) {
        throw new Error("useExplorerGlobals must be used within a ExplorerGlobalsProvider");
    }

    if (
        expectHydrated &&
        [context.state.canvas, context.state.view, context.state.scene, context.state.db].includes(undefined)
    ) {
        throw new Error("useExplorerGlobals(true) must not be used without first loading scene, view and canvas");
    }

    return context;
}
