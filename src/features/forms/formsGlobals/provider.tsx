import { ReactNode, useState } from "react";

import { Context, initialState } from "./reducer";

export function Provider({ children }: { children: ReactNode }) {
    const [state, setState] = useState(initialState);
    const value = { state, setState };

    return <Context.Provider value={value}>{children}</Context.Provider>;
}
