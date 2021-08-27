import { useCallback, useState } from "react";

export const useToggle = (initialState = false) => {
    const [state, setState] = useState(initialState);

    const toggle = useCallback(() => setState((state) => !state), []);

    return [state, toggle] as [state: typeof state, toggle: typeof toggle];
};
