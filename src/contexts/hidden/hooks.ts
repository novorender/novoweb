import { useContext, useEffect, useState } from "react";

import { DispatchContext, DispatchHidden, LazyState, LazyStateContext, State, StateContext } from "./reducer";

export function useHidden(): State {
    const context = useContext(StateContext);

    if (context === undefined) {
        throw new Error("useHidden must be used within a HiddenProvider");
    }

    return context;
}

export function useLazyHidden(): LazyState {
    const context = useContext(LazyStateContext);

    if (context === undefined) {
        throw new Error("useLazyHidden must be used within a LazyHiddenProvider");
    }

    return context;
}

export function useDispatchHidden(): DispatchHidden {
    const context = useContext(DispatchContext);

    if (context === undefined) {
        throw new Error("useDispatchHidden must be used within a HiddenProvider");
    }

    return context;
}

export function useIsHidden(id: number) {
    const [isHidden, setIsHidden] = useState(false);
    const { ids: hidden } = useHidden();

    useEffect(() => {
        setIsHidden(hidden[id] === true);
    }, [id, hidden]);

    return isHidden;
}
