import { useContext } from "react";

import {
    DispatchContext,
    DispatchLastPickSample,
    LazyContextType,
    LazyStateContext,
    State,
    StateContext,
} from "./reducer";

export function useLastPickSample(): State {
    const context = useContext(StateContext);

    if (context === undefined) {
        throw new Error("useLastPickSample must be used within a CameraStateProvider");
    }

    return context;
}

export function useLazyLastPickSample(): LazyContextType {
    const context = useContext(LazyStateContext);

    if (context === undefined) {
        throw new Error("useLazyLastPickSample must be used within a CameraStateProvider");
    }

    return context;
}

export function useDispatchLastPickSample(): DispatchLastPickSample {
    const context = useContext(DispatchContext);

    if (context === undefined) {
        throw new Error("useDispatchLastPickSample must be used within a CameraStateProvider");
    }

    return context;
}
