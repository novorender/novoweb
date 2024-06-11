import { useContext } from "react";

import {
    DispatchContext,
    DispatchFormsGlobals,
    LazyContextType,
    LazyStateContext,
    State,
    StateContext,
} from "./reducer";

export function useFormsGlobals(): State {
    const context = useContext(StateContext);

    if (context === undefined) {
        throw new Error("useFormsGlobals must be used within a FormsGlobalsProvider");
    }

    return context;
}

export function useLazyFormsGlobals(): LazyContextType {
    const context = useContext(LazyStateContext);

    if (context === undefined) {
        throw new Error("useLazyFormsGlobals must be used within a FormsGlobalsProvider");
    }

    return context;
}

export function useDispatchFormsGlobals(): DispatchFormsGlobals {
    const context = useContext(DispatchContext);

    if (context === undefined) {
        throw new Error("useDispatchFormsGlobals must be used within a FormsGlobalsProvider");
    }

    return context;
}
