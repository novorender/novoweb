import { useContext } from "react";

import { Context, ContextType } from "./reducer";

export function useFormsGlobals(): ContextType {
    const context = useContext(Context);

    if (context === undefined) {
        throw new Error("useFormsGlobals must be used within a FormsGlobalsProvider");
    }

    return context;
}
