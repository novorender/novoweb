import { useContext } from "react";

import {
    DispatchContext,
    DispatchObjectGroups,
    LazyContextType,
    LazyStateContext,
    State,
    StateContext,
} from "./reducer";

export function useObjectGroups(): State {
    const context = useContext(StateContext);

    if (context === undefined) {
        throw new Error("useObjectGroups must be used within a ObjectGroupsProvider");
    }

    return context;
}

export function useLazyObjectGroups(): LazyContextType {
    const context = useContext(LazyStateContext);

    if (context === undefined) {
        throw new Error("useLazyObjectGroups must be used within a ObjectGroupsProvider");
    }

    return context;
}

export function useDispatchObjectGroups(): DispatchObjectGroups {
    const context = useContext(DispatchContext);

    if (context === undefined) {
        throw new Error("useDispatchObjectGroups must be used within a ObjectGroupsProvider");
    }

    return context;
}
