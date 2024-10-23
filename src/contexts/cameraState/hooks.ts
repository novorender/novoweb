import { useContext } from "react";

import {
    DispatchCameraState,
    DispatchContext,
    LazyContextType,
    LazyStateContext,
    State,
    StateContext,
} from "./reducer";

export function useCameraState(): State {
    const context = useContext(StateContext);

    if (context === undefined) {
        throw new Error("useCameraState must be used within a CameraStateProvider");
    }

    return context;
}

export function useLazyCameraState(): LazyContextType {
    const context = useContext(LazyStateContext);

    if (context === undefined) {
        throw new Error("useLazyCameraState must be used within a CameraStateProvider");
    }

    return context;
}

export function useDispatchCameraState(): DispatchCameraState {
    const context = useContext(DispatchContext);

    if (context === undefined) {
        throw new Error("useDispatchCameraState must be used within a CameraStateProvider");
    }

    return context;
}
