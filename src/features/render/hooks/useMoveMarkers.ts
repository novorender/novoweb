import { vec3 } from "gl-matrix";
import { useCallback, useEffect } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useDitioFeedMarkers, useDitioMachineMarkers } from "features/ditio";
import { useDitioChecklistMarkers } from "features/ditio/hooks/useDitioChecklistMarkers";
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
    const [ditioPostMarkers, ditioImgMarkers] = useDitioFeedMarkers();
    const ditioMachineMarkers = useDitioMachineMarkers();
    const ditioChecklistMarkers = useDitioChecklistMarkers();
    const logPoints = useXsiteManageLogPointMarkers();
    const xsiteMachineMarkers = useXsiteManageMachineMarkers();
    const jiraMarkers = useJiraMarkers();

    const moveSvgMarkers = useCallback(() => {
        if (!view?.measure || !svg || !size) {
            return;
        }

        if (myLocationPoint !== undefined) {
            const myLocationPt = (view.measure.draw.toMarkerPoints([myLocationPoint]) ?? [])[0];
            if (myLocationPt) {
                const marker = svg.children.namedItem("myLocationPoint");

                marker?.setAttribute(
                    "transform",
                    `translate(${myLocationPt[0] - 25} ${myLocationPt[1] - 40}) scale(2)`
                );
            }
        }

        (view.measure.draw.toMarkerPoints(logPoints.map((lpt) => vec3.fromValues(lpt.x, lpt.y, lpt.z))) ?? []).forEach(
            (pos, idx) => {
                svg.children
                    .namedItem(`logPoint-${idx}`)
                    ?.setAttribute(
                        "transform",
                        pos ? `translate(${pos[0] - 25} ${pos[1] - 20})` : "translate(-100 -100)"
                    );
            }
        );

        if (showImageMarkers && images.status === AsyncStatus.Success) {
            (view.measure.draw.toMarkerPoints(images.data.map((image) => image.position)) ?? []).forEach((pos, idx) => {
                svg.children
                    .namedItem(`image-${idx}`)
                    ?.setAttribute(
                        "transform",
                        pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)"
                    );
            });
        }

        (view.measure.draw.toMarkerPoints(ditioPostMarkers.map((marker) => marker.position)) ?? []).forEach(
            (pos, idx) => {
                svg.children
                    .namedItem(`ditioPostMarker-${ditioPostMarkers[idx].id}`)
                    ?.setAttribute(
                        "transform",
                        pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)"
                    );
            }
        );

        (view.measure.draw.toMarkerPoints(ditioImgMarkers.map((marker) => marker.position)) ?? []).forEach(
            (pos, idx) => {
                svg.children
                    .namedItem(`ditioImgMarker-${ditioImgMarkers[idx].id}`)
                    ?.setAttribute(
                        "transform",
                        pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)"
                    );
            }
        );

        (view.measure.draw.toMarkerPoints(ditioMachineMarkers.map((marker) => marker.scenePosition)) ?? []).forEach(
            (pos, idx) => {
                svg.children
                    .namedItem(`ditioMachineMarker-${ditioMachineMarkers[idx].id}`)
                    ?.setAttribute(
                        "transform",
                        pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)"
                    );
            }
        );

        (view.measure.draw.toMarkerPoints(ditioChecklistMarkers.map((marker) => marker.position)) ?? []).forEach(
            (pos, idx) => {
                svg.children
                    .namedItem(`ditio-checklist-marker-${ditioChecklistMarkers[idx].id}`)
                    ?.setAttribute(
                        "transform",
                        pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)"
                    );
            }
        );

        (view.measure.draw.toMarkerPoints(xsiteMachineMarkers.map((marker) => marker.position)) ?? []).forEach(
            (pos, idx) => {
                svg.children
                    .namedItem(`machineMarker-${xsiteMachineMarkers[idx].machineId}`)
                    ?.setAttribute(
                        "transform",
                        pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)"
                    );
            }
        );

        (view.measure.draw.toMarkerPoints(jiraMarkers.map((marker) => marker.position)) ?? []).forEach((pos, idx) => {
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
        ditioMachineMarkers,
        ditioChecklistMarkers,
        images,
        showImageMarkers,
        xsiteMachineMarkers,
        jiraMarkers,
    ]);

    useEffect(() => {
        moveSvgMarkers();
    }, [moveSvgMarkers]);

    return moveSvgMarkers;
}
