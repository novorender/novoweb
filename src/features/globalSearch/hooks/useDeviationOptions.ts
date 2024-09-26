import { useMemo } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { selectDeviationProfiles } from "features/deviations";
import { AsyncStatus } from "types/misc";

import { Category } from "../types";

export function useDeviationOptions() {
    const profiles = useAppSelector(selectDeviationProfiles);

    return useMemo(() => {
        if (profiles.status !== AsyncStatus.Success) {
            return [];
        }

        return profiles.data.profiles.map((profile) => ({
            id: `deviation-${profile.id}`,
            label: profile.name,
            profile,
            category: Category.Deviation,
        }));
    }, [profiles]);
}
