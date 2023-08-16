import { vec3 } from "gl-matrix";
import { useCallback, useEffect } from "react";

import { measureApi } from "app";
import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useDitioMarkers } from "features/ditio";
import { selectImages, selectShowImageMarkers } from "features/images";
import { useJiraMarkers } from "features/jira";
import { selectCurrentLocation } from "features/myLocation";
import { useXsiteManageLogPointMarkers, useXsiteManageMachineMarkers } from "features/xsiteManage";
import { AsyncStatus } from "types/misc";

export function useMoveMarkers(svg: SVGSVGElement | null) {
    const {
        state: { view, size },
    } = useExplorerGlobals();

    const images = useAppSelector(selectImages);
    const showImageMarkers = useAppSelector(selectShowImageMarkers);
    const myLocationPoint = useAppSelector(selectCurrentLocation);
    const [ditioPostMarkers, ditioImgMarkers] = useDitioMarkers();
    const logPoints = useXsiteManageLogPointMarkers();
    const machineLocationMarkers = useXsiteManageMachineMarkers();
    const jiraMarkers = useJiraMarkers();

    const moveSvgMarkers = useCallback(() => {
        if (!view || !svg || !size) {
            return;
        }

        if (myLocationPoint !== undefined) {
            const myLocationPt = (measureApi.toMarkerPoints(size.width, size.height, view.renderState.camera, [
                myLocationPoint,
            ]) ?? [])[0];
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
                size.width,
                size.height,
                view.renderState.camera,
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
                    size.width,
                    size.height,
                    view.renderState.camera,
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
                size.width,
                size.height,
                view.renderState.camera,
                ditioPostMarkers.map((marker) => marker.position)
            ) ?? []
        ).forEach((pos, idx) => {
            svg.children
                .namedItem(`ditioPostMarker-${ditioPostMarkers[idx].id}`)
                ?.setAttribute("transform", pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)");
        });

        (
            measureApi.toMarkerPoints(
                size.width,
                size.height,
                view.renderState.camera,
                ditioImgMarkers.map((marker) => marker.position)
            ) ?? []
        ).forEach((pos, idx) => {
            svg.children
                .namedItem(`ditioImgMarker-${ditioImgMarkers[idx].id}`)
                ?.setAttribute("transform", pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)");
        });

        (
            measureApi.toMarkerPoints(
                size.width,
                size.height,
                view.renderState.camera,
                machineLocationMarkers.map((marker) => marker.position)
            ) ?? []
        ).forEach((pos, idx) => {
            svg.children
                .namedItem(`machineMarker-${machineLocationMarkers[idx].machineId}`)
                ?.setAttribute("transform", pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)");
        });

        (
            measureApi.toMarkerPoints(
                size.width,
                size.height,
                view.renderState.camera,
                jiraMarkers.map((marker) => marker.position)
            ) ?? []
        ).forEach((pos, idx) => {
            svg.children
                .namedItem(`jiraIssueMarker-${jiraMarkers[idx].key}`)
                ?.setAttribute("transform", pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)");
        });
    }, [
        view,
        svg,
        myLocationPoint,
        size,
        logPoints,
        ditioPostMarkers,
        ditioImgMarkers,
        images,
        showImageMarkers,
        machineLocationMarkers,
        jiraMarkers,
    ]);

    useEffect(() => {
        moveSvgMarkers();
    }, [moveSvgMarkers]);

    return moveSvgMarkers;
}
