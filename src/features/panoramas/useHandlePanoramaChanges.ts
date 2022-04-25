import { useRef, useEffect } from "react";
import { DynamicObject, CameraController, View, Scene } from "@novorender/webgl-api";

import { api } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAbortController } from "hooks/useAbortController";
import { renderActions, selectSubtrees } from "slices/renderSlice";
import { sleep } from "utils/timers";

import {
    PanoramaStatus,
    PanoramaType,
    panoramasActions,
    selectActivePanorama,
    selectPanoramaStatus,
} from "./panoramaSlice";

export function useHandlePanoramaChanges() {
    const {
        state: { view, scene },
    } = useExplorerGlobals();
    const activePanorama = useAppSelector(selectActivePanorama);
    const panoramaStatus = useAppSelector(selectPanoramaStatus);
    const subtrees = useAppSelector(selectSubtrees);
    const dispatch = useAppDispatch();

    const currentPanoramaObj = useRef<{ id: string; obj: DynamicObject }>();
    const panoramaIsActive = useRef(activePanorama !== undefined);
    const storedSubtrees = useRef<typeof subtrees>();
    const storedMouseButtonsMap = useRef<CameraController["mouseButtonsMap"]>({
        rotate: 1,
        pan: 4,
        orbit: 2,
        pivot: 2,
    });
    const storedFingersMap = useRef<CameraController["fingersMap"]>({ rotate: 1, pan: 2, orbit: 3, pivot: 3 });
    const [panoramaAbortController, abortPanorama] = useAbortController();

    useEffect(
        function handlePanoramaChanges() {
            if (!view || !scene) {
                return;
            }

            const currentObj = currentPanoramaObj.current;
            if (currentObj && currentObj.id !== activePanorama?.guid) {
                currentObj.obj.dispose();
                abortPanorama();
            }

            if (!activePanorama) {
                abortPanorama();
                panoramaIsActive.current = false;
                view.camera.controller.fingersMap = storedFingersMap.current;
                view.camera.controller.mouseButtonsMap = storedMouseButtonsMap.current;

                const currentlyStoredSubtree = storedSubtrees.current;
                if (currentlyStoredSubtree) {
                    storedSubtrees.current = undefined;
                    dispatch(renderActions.setSubtrees(currentlyStoredSubtree));
                }
            } else if (Array.isArray(panoramaStatus) && panoramaStatus[0] === PanoramaStatus.Loading) {
                if (!panoramaIsActive.current) {
                    storedMouseButtonsMap.current = view.camera.controller.mouseButtonsMap;
                    storedFingersMap.current = view.camera.controller.fingersMap;
                    storedSubtrees.current = subtrees;
                }

                panoramaIsActive.current = true;
                view.camera.controller.mouseButtonsMap = { pan: 0, rotate: 1, pivot: 0, orbit: 0 };
                view.camera.controller.fingersMap = { pan: 0, rotate: 1, pivot: 0, orbit: 0 };
                loadPanorama(activePanorama, view, scene);
            }

            async function loadPanorama(panorama: PanoramaType, view: View, scene: Scene) {
                const abortSignal = panoramaAbortController.current.signal;
                view.camera.controller.moveTo(panorama.position, panorama.rotation);

                let start = Date.now();
                if (view.camera.controller.params.kind === "flight") {
                    start += view.camera.controller.params.flightTime * 1000;
                }

                const url = new URL((scene as any).assetUrl);
                url.pathname += panorama.gltf;
                const asset = await api.loadAsset(url);

                if (!asset) {
                    return;
                }

                const delta = start - Date.now();
                if (delta > 0) {
                    await sleep(delta);
                }

                if (abortSignal.aborted) {
                    return;
                }

                const panoramaObj = scene.createDynamicObject(asset);
                currentPanoramaObj.current = { id: panorama.guid, obj: panoramaObj };
                panoramaObj.position = panorama.position;
                panoramaObj.visible = true;
                dispatch(panoramasActions.setStatus([PanoramaStatus.Active, panorama.guid]));
                dispatch(renderActions.disableAllSubtrees());
            }
        },
        [activePanorama, scene, view, dispatch, panoramaStatus, panoramaAbortController, abortPanorama, subtrees]
    );
}
