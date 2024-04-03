import { forwardRef, useImperativeHandle, useRef } from "react";

import { DitioFeedMarkers, DitioMachineMarkers } from "features/ditio";
import { ImageMarkers } from "features/images";
import { JiraMarkers } from "features/jira";
import { MyLocationMarker } from "features/myLocation";
import { LogPointMarkers, MachineLocationMarkers } from "features/xsiteManage";

export const Markers = forwardRef(function Markers(_, ref) {
    const childRefs = useRef([] as ({ update: () => void } | null)[]);

    useImperativeHandle(
        ref,
        () => ({
            update() {
                for (const childRef of childRefs.current) {
                    childRef?.update();
                }
            },
        }),
        []
    );

    return (
        <>
            {[
                MyLocationMarker,
                DitioFeedMarkers,
                DitioMachineMarkers,
                ImageMarkers,
                MachineLocationMarkers,
                LogPointMarkers,
                JiraMarkers,
            ].map((Container, idx) => (
                <Container key={idx} ref={(e) => (childRefs.current[idx] = e)} />
            ))}
        </>
    );
});
