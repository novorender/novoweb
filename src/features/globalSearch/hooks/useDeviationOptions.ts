import { useMemo } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { selectDeviationProfiles } from "features/deviations";
import { AsyncStatus } from "types/misc";

import { Category } from "../types";

export function useDeviationOptions(skip: boolean) {
    const profiles = useAppSelector(selectDeviationProfiles);

    return useMemo(() => {
        if (profiles.status !== AsyncStatus.Success || skip) {
            return [];
        }

        return profiles.data.profiles.map((profile) => ({
            id: profile.id,
            label: profile.name,
            profile,
            category: Category.Deviation,
        }));
    }, [profiles, skip]);
}
