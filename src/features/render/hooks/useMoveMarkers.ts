import { vec3 } from "gl-matrix";
import { useEffect, useCallback } from "react";

import { selectImages, selectShowImageMarkers } from "features/images";
import { measureApi } from "app";
import { useDitioMarkers } from "features/ditio";
import { useAppSelector } from "app/store";
import { selectCurrentLocation } from "features/myLocation";
import { useXsiteManageLogPointMarkers, useXsiteManageMachineMarkers } from "features/xsiteManage";
import { AsyncStatus } from "types/misc";
import { useExplorerGlobals } from "contexts/explorerGlobals";

export function useMoveMarkers(svg: SVGSVGElement | null) {
    const {
        state: { view, size },
    } = useExplorerGlobals();

    const images = useAppSelector(selectImages);
    const showImageMarkers = useAppSelector(selectShowImageMarkers);
    const myLocationPoint = useAppSelector(selectCurrentLocation);
    const ditioMarkers = useDitioMarkers();
    const logPoints = useXsiteManageLogPointMarkers();
    const machineLocationMarkers = useXsiteManageMachineMarkers();

    const moveSvgMarkers = useCallback(() => {
        if (!view || !svg || !size) {
            return;
        }

        if (myLocationPoint !== undefined) {
            const myLocationPt = (measureApi.toMarkerPoints(view, [myLocationPoint]) ?? [])[0];
            if (myLocationPt) {
                const marker = svg.children.namedItem("myLocationPoint");

                marker?.setAttribute(
                    "transform",
                    `translate(${myLocationPt[0] - 25} ${myLocationPt[1] - 40}) scale(2)`
                );
            }
        }

        (
            measureApi.toMarkerPoints(
                view,
                logPoints.map((lpt) => vec3.fromValues(lpt.x, lpt.y, lpt.z))
            ) ?? []
        ).forEach((pos, idx) => {
            svg.children
                .namedItem(`logPoint-${idx}`)
                ?.setAttribute("transform", pos ? `translate(${pos[0] - 25} ${pos[1] - 20})` : "translate(-100 -100)");
        });

        if (showImageMarkers && images.status === AsyncStatus.Success) {
            (
                measureApi.toMarkerPoints(
                    view,
                    images.data.map((image) => image.position)
                ) ?? []
            ).forEach((pos, idx) => {
                svg.children
                    .namedItem(`image-${idx}`)
                    ?.setAttribute(
                        "transform",
                        pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)"
                    );
            });
        }

        (
            measureApi.toMarkerPoints(
                view,
                ditioMarkers.map((marker) => marker.position)
            ) ?? []
        ).forEach((pos, idx) => {
            svg.children
                .namedItem(`ditioMarker-${idx}`)
                ?.setAttribute("transform", pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)");
        });

        (
            measureApi.toMarkerPoints(
                view,
                machineLocationMarkers.map((marker) => marker.position)
            ) ?? []
        ).forEach((pos, idx) => {
            svg.children
                .namedItem(`machineMarker-${machineLocationMarkers[idx].machineId}`)
                ?.setAttribute("transform", pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)");
        });
    }, [view, svg, myLocationPoint, size, logPoints, ditioMarkers, images, showImageMarkers, machineLocationMarkers]);

    useEffect(() => {
        moveSvgMarkers();
    }, [moveSvgMarkers]);

    return moveSvgMarkers;
}
