import { useCallback, useState } from "react";
import { useIsMounted } from "hooks/useIsMounted";

export function useMountedState<T>(defaultValue: T | (() => T)) {
    const isMounted = useIsMounted();
    const [state, setState] = useState(defaultValue);

    const defensiveSetState = useCallback(
        (newValue: T) => {
            if (isMounted.current) {
                setState(newValue);
            }
        },
        [isMounted]
    );

    return [state, defensiveSetState, isMounted] as [
        state: typeof state,
        setState: typeof setState,
        isMounted: typeof isMounted
    ];
}
