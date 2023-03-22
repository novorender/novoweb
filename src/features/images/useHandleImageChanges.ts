import { useRef, useEffect } from "react";
import { DynamicObject, View, Scene, DynamicAsset } from "@novorender/webgl-api";

import { api } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAbortController } from "hooks/useAbortController";
import { CameraType, renderActions } from "features/render/renderSlice";
import { sleep } from "utils/time";
import { getAssetUrl } from "utils/misc";
import { AsyncStatus, ViewMode } from "types/misc";

import { FlatImage, imagesActions, PanoramaImage, selectActiveImage } from "./imagesSlice";
import { isPanorama } from "./utils";

export function useHandleImageChanges() {
    const {
        state: { view, scene },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();

    const activeImage = useAppSelector(selectActiveImage);
    const currentPanorama = useRef<{ image: PanoramaImage; obj?: DynamicObject; asset?: DynamicAsset }>();
    const [abortController, abort] = useAbortController();

    useEffect(
        function handleImageChanges() {
            if (!view || !scene) {
                return;
            }

            if (
                activeImage?.status === AsyncStatus.Success ||
                (activeImage && activeImage.image.guid === currentPanorama.current?.image.guid)
            ) {
                return;
            }

            abort();
            currentPanorama.current?.obj?.dispose();
            currentPanorama.current?.asset?.dispose();
            currentPanorama.current = undefined;

            if (!activeImage) {
                dispatch(renderActions.setViewMode(ViewMode.Default));
                dispatch(renderActions.setCamera({ type: CameraType.Flight }));
                return;
            }

            if (isPanorama(activeImage.image)) {
                loadPanorama(activeImage.image, view, scene);
            } else {
                loadFlatImage(activeImage.image, view);
            }

            function loadFlatImage(image: FlatImage, view: View) {
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Flight,
                        goTo: { position: image.position, rotation: view.camera.rotation },
                    })
                );
                dispatch(renderActions.setViewMode(ViewMode.Default));
                dispatch(imagesActions.setActiveImage({ image, status: AsyncStatus.Success }));
            }

            async function loadPanorama(panorama: PanoramaImage, view: View, scene: Scene) {
                const abortSignal = abortController.current.signal;

                const rotation = panorama.rotation ?? view.camera.rotation;
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Flight,
                        goTo: { position: panorama.position, rotation },
                    })
                );
                dispatch(renderActions.setViewMode(ViewMode.Panorama));
                currentPanorama.current = { image: panorama };

                let start = Date.now();
                if (view.camera.controller.params.kind === "flight") {
                    start += view.camera.controller.params.flightTime * 1000;
                }

                const url = getAssetUrl(scene, panorama.gltf);
                const asset = await api.loadAsset(url);

                if (!asset) {
                    dispatch(renderActions.setViewMode(ViewMode.Default));
                    return;
                }

                const delta = start - Date.now();
                if (delta > 0) {
                    await sleep(delta);
                }

                if (abortSignal.aborted) {
                    return;
                }

                const obj = scene.createDynamicObject(asset);
                currentPanorama.current = { image: panorama, obj, asset };
                obj.position = panorama.position;
                obj.visible = true;
                dispatch(imagesActions.setActiveImage({ image: panorama, status: AsyncStatus.Success }));
            }
        },
        [activeImage, scene, view, dispatch, abortController, abort]
    );
}
