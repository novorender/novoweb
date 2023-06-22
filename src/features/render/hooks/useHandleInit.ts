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
import { CustomProperties } from "types/project";
import { VecRGBA } from "utils/color";

import { renderActions } from "..";
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
                const [{ url, db, ...sceneData }, camera] = await loadScene(sceneId);
                const octreeSceneConfig = await _view.loadSceneFromURL(new URL(url));

                _view.run();

                dispatch(
                    renderActions.initScene({
                        sceneData,
                        sceneConfig: octreeSceneConfig,
                        initialCamera: {
                            kind: camera?.kind ?? _view.renderState.camera.kind,
                            position: vec3.clone(camera?.position ?? _view.renderState.camera.position),
                            rotation: quat.clone(camera?.rotation ?? _view.renderState.camera.rotation),
                            fov: camera?.fov ?? _view.renderState.camera.fov,
                        },
                        deviceProfile: structuredClone(_view.renderContext?.deviceProfile),
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

export type SceneConfig = Omit<SceneData, "settings" | "customProperties"> & {
    settings: Internal.RenderSettingsExt;
    customProperties: CustomProperties;
};

export type CadCamera = { kind: "pinhole" | "orthographic"; position: vec3; rotation: quat; fov: number };
export async function loadScene(id: string): Promise<[SceneConfig, CadCamera | undefined]> {
    const res: (SceneData & { version?: string }) | SceneLoadFail = await dataApi.loadScene(id);
    let camera: CadCamera | undefined = undefined;

    if ("error" in res) {
        throw res;
    }

    let { ..._cfg } = res;
    const cfg = _cfg as SceneConfig;

    // Legacy scene config format
    // needs to be flipped.
    if (!cfg.customProperties?.initialCameraState) {
        if (cfg.camera && (cfg.camera.kind === "ortho" || cfg.camera.kind === "flight")) {
            camera =
                cfg.camera.kind === "ortho"
                    ? {
                          kind: "orthographic",
                          position: flip([
                              cfg.camera.referenceCoordSys[12],
                              cfg.camera.referenceCoordSys[13],
                              cfg.camera.referenceCoordSys[14],
                          ]),
                          rotation: rotationFromDirection(
                              flip([
                                  cfg.camera.referenceCoordSys[8],
                                  cfg.camera.referenceCoordSys[9],
                                  cfg.camera.referenceCoordSys[10],
                              ])
                          ),
                          fov: cfg.camera.fieldOfView,
                      }
                    : {
                          kind: "pinhole",
                          position: flip(cfg.camera.position),
                          rotation: computeRotation(0, cfg.camera.pitch, cfg.camera.yaw),
                          fov: cfg.camera.fieldOfView,
                      };
        }
    } else {
        camera = cfg.customProperties.initialCameraState;
    }

    if (cfg.customProperties.v1 && cfg.settings && cfg.settings.background) {
        cfg.settings.background.color = getBackgroundColor(cfg.settings.background.color);
    }

    return [cfg, camera];
}

function getBackgroundColor(color: vec4 | undefined): vec4 {
    const grey: vec4 = [0.75, 0.75, 0.75, 1];
    const legacyBlue: vec4 = [0, 0, 0.25, 1];

    if (!color || vec4.equals(color, legacyBlue)) {
        return grey;
    }

    return color;
}
