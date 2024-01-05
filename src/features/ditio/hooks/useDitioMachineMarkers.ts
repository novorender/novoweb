import { vec3 } from "gl-matrix";
import { useEffect, useState } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectIsTopDown } from "features/orthoCam";
import { CameraType, selectCameraType, selectProjectSettings } from "features/render";
import { latLon2Tm } from "features/render/utils";
import { AsyncStatus } from "types/misc";
import { secondsToMs } from "utils/time";

import { useGetLiveMachinesQuery } from "../api";
import { selectDitioAccessToken, selectDitioProjects, selectShowDitioMachineMarkers } from "../slice";
import { Dumper, Loader, Machine } from "../types";

const empty = [] as Machine[];

export function useDitioMachineMarkers() {
    const {
        state: { view, scene },
    } = useExplorerGlobals();
    const { tmZone } = useAppSelector(selectProjectSettings);
    const cameraType = useAppSelector(selectCameraType);
    const showMarkers = useAppSelector(selectShowDitioMachineMarkers);
    const projects = useAppSelector(selectDitioProjects);
    const token = useAppSelector(selectDitioAccessToken);
    const isTopDown = useAppSelector(selectIsTopDown);
    const skip =
        cameraType !== CameraType.Orthographic ||
        !isTopDown ||
        token.status !== AsyncStatus.Success ||
        !tmZone ||
        !view ||
        !projects.length ||
        !showMarkers;
    const { data: machines } = useGetLiveMachinesQuery(undefined, {
        skip,
        pollingInterval: secondsToMs(45),
    });
    const [markers, setMarkers] = useState(empty);

    useEffect(() => {
        const bounds = view?.renderState.scene?.config.boundingSphere;
        if (!machines || !tmZone || !bounds) {
            return;
        }

        const filteredMachines = [...machines.dumperLiveDataList, ...machines.loaderLiveDataList]
            .filter((machine) => projects.includes(machine.projectId))
            .map((machine) => {
                const scenePosition = latLon2Tm({
                    up: scene?.up,
                    coords: {
                        longitude: machine.lastKnownLocation.coordinates[0],
                        latitude: machine.lastKnownLocation.coordinates[1],
                    },
                    tmZone,
                });

                if ("dumperId" in machine) {
                    return {
                        ...machine,
                        scenePosition,
                        kind: "dumper",
                        id: machine.dumperId,
                    } as Dumper;
                } else {
                    return {
                        ...machine,
                        scenePosition,
                        kind: "loader",
                        id: machine.loaderId,
                    } as Loader;
                }
            })
            .filter((machine) => vec3.dist(machine.scenePosition, bounds.center) <= bounds.radius)
            .sort((a, b) => new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime());

        setMarkers(filteredMachines);
    }, [machines, tmZone, view, projects, scene]);

    return skip ? empty : markers;
}
