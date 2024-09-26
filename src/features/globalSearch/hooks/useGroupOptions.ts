import { useMemo } from "react";

import { isInternalGroup, useObjectGroups } from "contexts/objectGroups";

import { Category } from "../types";

export function useGroupOptions() {
    const objectGroups = useObjectGroups();

    return useMemo(() => {
        return objectGroups
            .filter((grp) => !isInternalGroup(grp))
            .map((g) => ({
                id: g.id,
                label: g.name,
                group: g,
                category: Category.Group as const,
            }));
    }, [objectGroups]);
}
