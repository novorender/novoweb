import { useAppSelector } from "app/store";
import { useEffect, useState } from "react";

import { selectXsiteManageMachineLocations, selectXsiteManageShowMachineMarkers } from "../slice";
import { MachineLocation } from "../types";

const empty = [] as MachineLocation[];

export function useXsiteManageMachineMarkers() {
    const showMarkers = useAppSelector(selectXsiteManageShowMachineMarkers);
    const locations = useAppSelector(selectXsiteManageMachineLocations);

    const [markers, setMarkers] = useState(empty);

    useEffect(() => {
        const arr = Object.values(locations);
        if (!showMarkers || !arr.length) {
            setMarkers(empty);
            return;
        }

        setMarkers(arr);
    }, [showMarkers, locations]);

    return markers;
}
