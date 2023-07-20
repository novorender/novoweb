import { loadGLTF, RenderStateDynamicObject, View } from "@novorender/web_app";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraType, renderActions } from "features/render/renderSlice";
import { useAbortController } from "hooks/useAbortController";
import { AsyncStatus, ViewMode } from "types/misc";
import { handleImageResponse } from "utils/bcf";
import { getAssetUrl } from "utils/misc";
import { sleep } from "utils/time";

import { FlatImage, imagesActions, PanoramaImage, selectActiveImage } from "./imagesSlice";
import { isPanorama } from "./utils";

export function useHandleImages() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();

    const activeImage = useAppSelector(selectActiveImage);
    const currentPanorama = useRef<{ image: PanoramaImage; obj?: RenderStateDynamicObject }>();
    const [abortController, abort] = useAbortController();

    useEffect(
        function handleImageChanges() {
            if (!view) {
                return;
            }

            if (
                activeImage?.status === AsyncStatus.Success ||
                (activeImage && activeImage.image.guid === currentPanorama.current?.image.guid)
            ) {
                return;
            }

            abort();
            view.modifyRenderState({ dynamic: { objects: [] } });
            currentPanorama.current = undefined;

            if (!activeImage) {
                dispatch(renderActions.setViewMode(ViewMode.Default));
                dispatch(renderActions.setCamera({ type: CameraType.Pinhole }));
                return;
            }

            if (isPanorama(activeImage.image)) {
                loadPanorama(activeImage.image, view);
            } else {
                loadFlatImage(activeImage.image, view);
            }

            async function loadFlatImage(image: FlatImage, view: View) {
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Pinhole,
                        goTo: { position: image.position, rotation: view.renderState.camera.rotation },
                    })
                );
                const src = await fetch(getAssetUrl(view, image.src).toString()).then((res) =>
                    handleImageResponse(res)
                );
                dispatch(renderActions.setViewMode(ViewMode.Default));
                dispatch(imagesActions.setActiveImage({ image: { ...image, src }, status: AsyncStatus.Success }));
            }

            async function loadPanorama(panorama: PanoramaImage, view: View) {
                const abortSignal = abortController.current.signal;

                const rotation = panorama.rotation ?? view.renderState.camera.rotation;
                dispatch(renderActions.setViewMode(ViewMode.Panorama));
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Pinhole,
                        goTo: { position: panorama.position, rotation },
                    })
                );
                currentPanorama.current = { image: panorama };

                let start = Date.now();
                if (view.renderState.camera.kind === "pinhole") {
                    start += 1000;
                }

                const url = getAssetUrl(view, panorama.gltf);
                const obj = (await loadGLTF(url).catch(() => []))[0];

                if (!obj) {
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

                currentPanorama.current = { image: panorama, obj };
                view.modifyRenderState({
                    dynamic: {
                        objects: [{ ...obj, instances: [{ position: panorama.position }] }],
                    },
                });
                dispatch(imagesActions.setActiveImage({ image: panorama, status: AsyncStatus.Success }));
            }
        },
        [activeImage, view, dispatch, abortController, abort]
    );
}
