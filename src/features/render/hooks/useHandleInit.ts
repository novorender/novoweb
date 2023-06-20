import { SceneData, SceneLoadFail } from "@novorender/data-js-api";
import { computeRotation, createView, rotationFromDirection } from "@novorender/web_app";
import { Internal, ObjectDB } from "@novorender/webgl-api";
import { quat, vec3, vec4 } from "gl-matrix";
import { useEffect, useRef } from "react";

import { dataApi } from "app";
import { useAppDispatch } from "app/store";
import { explorerGlobalsActions, useExplorerGlobals } from "contexts/explorerGlobals";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
} from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { GroupStatus, objectGroupsActions, useDispatchObjectGroups } from "contexts/objectGroups";
import { useSceneId } from "hooks/useSceneId";
import { AsyncStatus } from "types/misc";
import { VecRGBA } from "utils/color";

import { DeepMutable, renderActions } from "..";
import { CustomProperties } from "../render";
import { Error as SceneError } from "../sceneError";
import { flip } from "../utils";

export function useHandleInit() {
    const sceneId = useSceneId();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const {
        state: { view, canvas },
        dispatch: dispatchGlobals,
    } = useExplorerGlobals();

    const dispatch = useAppDispatch();

    const initialized = useRef(false);

    useEffect(() => {
        initView();

        async function initView() {
            if (initialized.current || !canvas || view) {
                return;
            }

            initialized.current = true;
            dispatch(renderActions.setSceneStatus({ status: AsyncStatus.Loading }));

            const _view = createView(canvas);

            try {
                const { url, db, ...sceneData } = await loadScene(sceneId);
                const octreeSceneConfig = await _view.loadSceneFromURL(new URL(url));

                // TODO(?): Set in initScene() and handle effect?
                // if (sceneData.camera) {
                //     await _view.switchCameraController(sceneData.camera.kind, {
                //         position: sceneData.camera.position,
                //         rotation: sceneData.camera.rotation,
                //     });
                // }

                _view.run();

                dispatch(
                    renderActions.initScene({
                        sceneData,
                        sceneConfig: octreeSceneConfig,
                        initialCamera: {
                            kind: sceneData.camera?.kind ?? _view.renderState.camera.kind,
                            position: vec3.clone(sceneData.camera?.position ?? _view.renderState.camera.position),
                            rotation: quat.clone(sceneData.camera?.rotation ?? _view.renderState.camera.rotation),
                            fov: sceneData.camera?.fov ?? _view.renderState.camera.fov,
                        },
                    })
                );
                dispatchObjectGroups(
                    objectGroupsActions.set(
                        sceneData.objectGroups
                            .filter((group) => group.id && group.search)
                            .map((group) => ({
                                name: group.name,
                                id: group.id,
                                grouping: group.grouping ?? "",
                                color: group.color ?? ([1, 0, 0, 1] as VecRGBA),
                                opacity: group.opacity ?? 0,
                                search: group.search ?? [],
                                includeDescendants: group.includeDescendants ?? true,
                                status: group.selected
                                    ? GroupStatus.Selected
                                    : group.hidden
                                    ? GroupStatus.Hidden
                                    : GroupStatus.Default,
                                ids: group.ids ? new Set(group.ids) : (undefined as any), // TODO any?
                            }))
                    )
                );
                dispatchHighlighted(
                    highlightActions.setColor(sceneData.customProperties.highlights?.primary.color ?? [1, 0, 0, 1])
                );
                dispatchHighlightCollections(
                    highlightCollectionsActions.setColor(
                        HighlightCollection.SecondaryHighlight,
                        sceneData.customProperties.highlights?.secondary.color ?? [1, 1, 0, 1]
                    )
                );

                window.document.title = `${sceneData.title} - Novorender`;
                const resizeObserver = new ResizeObserver((entries) => {
                    for (const entry of entries) {
                        canvas.width = entry.contentRect.width;
                        canvas.height = entry.contentRect.height;
                        dispatchGlobals(
                            explorerGlobalsActions.update({ size: { width: canvas.width, height: canvas.height } })
                        );
                    }
                });

                resizeObserver.observe(canvas);
                dispatchGlobals(
                    explorerGlobalsActions.update({
                        db: db as ObjectDB,
                        view: _view,
                        scene: octreeSceneConfig,
                    })
                );
                dispatch(renderActions.setSceneStatus({ status: AsyncStatus.Success, data: undefined }));
            } catch (e) {
                console.warn(e);
                if (e && typeof e === "object" && "error" in e) {
                    const error = (e as { error: string }).error;

                    if (error === "Not authorized") {
                        dispatch(
                            renderActions.setSceneStatus({ status: AsyncStatus.Error, msg: SceneError.NOT_AUTHORIZED })
                        );
                    } else if (error === "Scene not found") {
                        dispatch(
                            renderActions.setSceneStatus({ status: AsyncStatus.Error, msg: SceneError.INVALID_SCENE })
                        );
                    } else {
                        dispatch(
                            renderActions.setSceneStatus({ status: AsyncStatus.Error, msg: SceneError.UNKNOWN_ERROR })
                        );
                    }
                } else if (e instanceof Error) {
                    dispatch(
                        renderActions.setSceneStatus({
                            status: AsyncStatus.Error,
                            msg: SceneError.UNKNOWN_ERROR,
                            stack: e.stack
                                ? e.stack
                                : typeof e.cause === "string"
                                ? e.cause
                                : `${e.name}: ${e.message}`,
                        })
                    );
                }
            }
        }
    }, [
        canvas,
        view,
        dispatch,
        sceneId,
        dispatchGlobals,
        dispatchObjectGroups,
        dispatchHighlighted,
        dispatchHighlightCollections,
    ]);
}

export type SceneConfig = Omit<DeepMutable<SceneData>, "camera" | "environment" | "settings" | "customProperties"> & {
    settings: Internal.RenderSettingsExt;
    camera?: { kind: "pinhole" | "orthographic"; position: vec3; rotation: quat; fov: number };
    environment: string;
    version?: string;
    customProperties: CustomProperties;
};

export async function loadScene(id: string): Promise<SceneConfig> {
    const res: (SceneData & { version?: string }) | SceneLoadFail = await dataApi.loadScene(id);

    if ("error" in res) {
        throw res;
    }

    (window as any).db = res.db;

    let { camera, ..._cfg } = res;
    const cfg = _cfg as SceneConfig;

    // Legacy scene config format
    // needs to be flipped.
    if (!cfg.customProperties?.v1) {
        if (!camera || !(camera.kind === "ortho" || camera.kind === "flight")) {
            return cfg;
        }

        cfg.camera =
            camera.kind === "ortho"
                ? {
                      kind: "orthographic",
                      position: flip([
                          camera.referenceCoordSys[12],
                          camera.referenceCoordSys[13],
                          camera.referenceCoordSys[14],
                      ]),
                      rotation: rotationFromDirection(
                          flip([camera.referenceCoordSys[8], camera.referenceCoordSys[9], camera.referenceCoordSys[10]])
                      ),
                      fov: camera.fieldOfView,
                  }
                : {
                      kind: "pinhole",
                      position: flip(camera.position),
                      rotation: computeRotation(0, camera.pitch, camera.yaw),
                      fov: camera.fieldOfView,
                  };

        cfg.environment = cfg.settings?.environment
            ? "https://api.novorender.com/assets/env/" + (cfg.settings.environment as any as string) + "/"
            : "";
    } else {
        cfg.camera = cfg.customProperties.v1.camera.initialState;

        // todo save env
        cfg.environment = cfg.settings?.environment
            ? "https://api.novorender.com/assets/env/" + (cfg.settings.environment as any as string) + "/"
            : "";
    }

    if (cfg.settings && cfg.settings.background) {
        cfg.settings.background.color = getBackgroundColor(cfg.settings.background.color);
    }

    return cfg;
}

function getBackgroundColor(color: vec4 | undefined): vec4 {
    const grey: vec4 = [0.75, 0.75, 0.75, 1];
    const legacyBlue: vec4 = [0, 0, 0.25, 1];

    if (!color || vec4.equals(color, legacyBlue)) {
        return grey;
    }

    return color;
}
