import { useContext } from "react";

import { DispatchContext, DispatchSelectionBasket, LazyState, LazyStateContext, State, StateContext } from "./reducer";

export function useSelectionBasket(): State {
    const context = useContext(StateContext);

    if (context === undefined) {
        throw new Error("useSelectionBasket must be used within a SelectionBasketProvider");
    }

    return context;
}

export function useLazySelectionBasket(): LazyState {
    const context = useContext(LazyStateContext);

    if (context === undefined) {
        throw new Error("useLazySelectionBasket must be used within a LazySelectionBasketProvider");
    }

    return context;
}

export function useDispatchSelectionBasket(): DispatchSelectionBasket {
    const context = useContext(DispatchContext);

    if (context === undefined) {
        throw new Error("useDispatchSelectionBasket must be used within a SelectionBasketProvider");
    }

    return context;
}
