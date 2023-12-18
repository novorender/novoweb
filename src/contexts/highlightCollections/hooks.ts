import { useContext } from "react";

import {
    DispatchContext,
    DispatchHighlightCollection,
    LazyState,
    LazyStateContext,
    State,
    StateContext,
} from "./reducer";

export function useHighlightCollections(): State {
    const context = useContext(StateContext);

    if (context === undefined) {
        throw new Error("useHighlightCollection must be used within a HighlightCollectionProvider");
    }

    return context;
}

export function useLazyHighlightCollections(): LazyState {
    const context = useContext(LazyStateContext);

    if (context === undefined) {
        throw new Error("useLazyHighlightCollection must be used within a LazyHighlightCollectionProvider");
    }

    return context;
}

export function useDispatchHighlightCollections(): DispatchHighlightCollection {
    const context = useContext(DispatchContext);

    if (context === undefined) {
        throw new Error("useDispatchHighlightCollection must be used within a HighlightCollectionProvider");
    }

    return context;
}
