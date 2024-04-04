import { useTheme } from "@mui/material";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { LocationStatus, selectCurrentLocation, selectLocationStatus } from "./myLocationSlice";

export const MyLocationMarker = forwardRef<{ update: () => void }>(function MyLocationMarker(_, ref) {
    const theme = useTheme();
    const {
        state: { view },
    } = useExplorerGlobals();

    const location = useAppSelector(selectCurrentLocation);
    const { status } = useAppSelector(selectLocationStatus);

    const [container, setContainer] = useState<SVGPathElement | null>(null);

    const update = useCallback(() => {
        if (!view?.measure || !container || !location) {
            return;
        }

        const pt = view.measure.draw.toMarkerPoints([location])[0]!;
        if (pt) {
            container.setAttribute("transform", `translate(${pt[0] - 25} ${pt[1] - 40}) scale(2)`);
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
            {location && status !== LocationStatus.Error && (
                <path
                    ref={setContainer}
                    id="myLocationPoint"
                    name="myLocationPoint"
                    fill={theme.palette.primary.main}
                    d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 2c1.1 0 2 .9 2 2 0 1.11-.9 2-2 2s-2-.89-2-2c0-1.1.9-2 2-2zm0 10c-1.67 0-3.14-.85-4-2.15.02-1.32 2.67-2.05 4-2.05s3.98.73 4 2.05c-.86 1.3-2.33 2.15-4 2.15z"
                />
            )}
        </>
    );
});
