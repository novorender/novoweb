import { useContext, useEffect, useState } from "react";

import { DispatchContext, DispatchHighlighted, LazyState, LazyStateContext, State, StateContext } from "./reducer";

export function useHighlighted(): State {
    const context = useContext(StateContext);

    if (context === undefined) {
        throw new Error("useHighlighted must be used within a HighlightedProvider");
    }

    return context;
}

export function useLazyHighlighted(): LazyState {
    const context = useContext(LazyStateContext);

    if (context === undefined) {
        throw new Error("useLazyHighlighted must be used within a LazyHighlightedProvider");
    }

    return context;
}

export function useDispatchHighlighted(): DispatchHighlighted {
    const context = useContext(DispatchContext);

    if (context === undefined) {
        throw new Error("useDispatchHighlighted must be used within a HighlightedProvider");
    }

    return context;
}

export function useIsHighlighted(id: number) {
    const [isHighlighted, setIsHighlighted] = useState(false);
    const { ids: highlighted } = useHighlighted();

    useEffect(() => {
        setIsHighlighted(highlighted[id] === true);
    }, [id, highlighted]);

    return isHighlighted;
}
