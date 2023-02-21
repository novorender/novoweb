import { useRef, useEffect } from "react";
import { DynamicObject, View, Scene } from "@novorender/webgl-api";

import { api } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAbortController } from "hooks/useAbortController";
import { CameraType, renderActions, selectSubtrees } from "features/render/renderSlice";
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
    const [panoramaAbortController, abortPanorama] = useAbortController();

    useEffect(
        function handlePanoramaChanges() {
            if (!view || !scene) {
                return;
            }

            const currentObj = currentPanoramaObj.current;
            if (currentObj && currentObj.id !== activePanorama?.name) {
                currentObj.obj.dispose();
                abortPanorama();
            }

            if (!activePanorama) {
                abortPanorama();
                panoramaIsActive.current = false;

                const currentlyStoredSubtree = storedSubtrees.current;
                if (currentlyStoredSubtree) {
                    storedSubtrees.current = undefined;
                    dispatch(renderActions.setSubtrees(currentlyStoredSubtree));
                }
            } else if (Array.isArray(panoramaStatus) && panoramaStatus[0] === PanoramaStatus.Loading) {
                if (!panoramaIsActive.current) {
                    storedSubtrees.current = subtrees;
                }

                panoramaIsActive.current = true;
                loadPanorama(activePanorama, view, scene);
            }

            async function loadPanorama(panorama: PanoramaType, view: View, scene: Scene) {
                const abortSignal = panoramaAbortController.current.signal;
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Flight,
                        goTo: { position: panorama.position, rotation: panorama.rotation },
                    })
                );

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
                currentPanoramaObj.current = { id: panorama.name, obj: panoramaObj };
                panoramaObj.position = panorama.position;
                panoramaObj.visible = true;
                dispatch(panoramasActions.setStatus([PanoramaStatus.Active, panorama.name]));
                dispatch(renderActions.disableAllSubtrees());
            }
        },
        [activePanorama, scene, view, dispatch, panoramaStatus, panoramaAbortController, abortPanorama, subtrees]
    );
}
