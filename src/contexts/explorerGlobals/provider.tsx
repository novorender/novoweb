import { ReactNode, useReducer } from "react";

import { Context, initialState, reducer } from "./reducer";

// Values that are used all over the place within Explorer, but are unserializable go here instead of redux store.

export function Provider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const value = { state, dispatch };

    return <Context.Provider value={value}>{children}</Context.Provider>;
}
