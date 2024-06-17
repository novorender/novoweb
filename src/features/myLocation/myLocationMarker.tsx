import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import {
    LocationStatus,
    selectCurrentLocation,
    selectLocationStatus,
    selectShowLocationMarker,
} from "./myLocationSlice";

export const MyLocationMarker = forwardRef<{ update: () => void }>(function MyLocationMarker(_, ref) {
    const {
        state: { view },
    } = useExplorerGlobals();

    const location = useAppSelector(selectCurrentLocation);
    const showMarker = useAppSelector(selectShowLocationMarker);
    const { status } = useAppSelector(selectLocationStatus);

    const [container, setContainer] = useState<SVGElement | null>(null);

    const update = useCallback(() => {
        if (!view?.measure || !container || !location) {
            return;
        }

        const pt = view.measure.draw.toMarkerPoints([location])[0]!;
        if (pt) {
            container.setAttribute("transform", `translate(${pt[0]} ${pt[1]})`);
        } else {
            container.setAttribute("transform", `translate(-100 -100) scale(0)`);
        }
    }, [view?.measure, location, container]);

    useImperativeHandle(ref, () => ({ update }), [update]);

    useEffect(() => {
        update();
    }, [update]);

    return (
        <>
            {showMarker && location && status !== LocationStatus.Error && (
                <g ref={setContainer} id="myLocationPoint" name="myLocationPoint">
                    <circle cx="0" cy="0" r="16" fill="#4185f480" />
                    <circle cx="0" cy="0" r="8" fill="#4185f4" stroke="white" strokeWidth="1" />
                </g>
            )}
        </>
    );
});
