import { mergeRecursive, SceneConfig } from "@novorender/api";
import { useSetDeviationProfilesMutation } from "apis/dataV2/dataV2Api";
import { useCallback } from "react";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { isInternalGroup, ObjectGroup, useObjectGroups } from "contexts/objectGroups";
import { selectDeviations } from "features/render";
import { loadScene } from "features/render/hooks/useHandleInit";
import { useSceneId } from "hooks/useSceneId";
import { selectIsAdminScene, selectProjectIsV2 } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";

import { deviationsActions } from "../deviationsSlice";
import { UiDeviationConfig } from "../deviationTypes";
import { uiConfigToServerConfig } from "../utils";

export function useSaveDeviationConfig() {
    const dispatch = useAppDispatch();
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const projectId = scene.id;
    const sceneId = useSceneId();
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const isProjectV2 = useAppSelector(selectProjectIsV2);
    const [setDeviationProfiles] = useSetDeviationProfilesMutation();
    const objectGroups = useObjectGroups().filter((grp) => !isInternalGroup(grp));

    return useCallback(
        async ({
            uiConfig,
            deviations,
            showRebuildMessage,
        }: {
            uiConfig: UiDeviationConfig;
            deviations: ReturnType<typeof selectDeviations>;
            showRebuildMessage?: boolean;
        }) => {
            dispatch(deviationsActions.setSaveStatus({ status: AsyncStatus.Loading }));
            try {
                await saveExplorerSettings({
                    scene,
                    sceneId,
                    deviations,
                    isAdminScene,
                });

                if (isProjectV2) {
                    const uiConfigWithObjectIds = updateObjectIds(uiConfig, objectGroups);
                    await setDeviationProfiles({
                        projectId,
                        config: uiConfigToServerConfig(uiConfigWithObjectIds),
                    }).unwrap();
                }

                let msg = "Changes successfully saved";
                if (showRebuildMessage) {
                    msg += ". Group updates won't be reflected until you rerun the calculation.";
                }
                dispatch(deviationsActions.setSaveStatus({ status: AsyncStatus.Success, data: msg }));
            } catch (ex) {
                dispatch(deviationsActions.setSaveStatus({ status: AsyncStatus.Error, msg: "Failed to save changes" }));
            }
        },
        [dispatch, projectId, scene, sceneId, isAdminScene, isProjectV2, setDeviationProfiles, objectGroups]
    );
}

async function saveExplorerSettings({
    scene,
    sceneId,
    deviations,
    isAdminScene,
}: {
    scene: SceneConfig;
    sceneId: string;
    deviations: ReturnType<typeof selectDeviations>;
    isAdminScene: boolean;
}) {
    const id = scene.id;

    const [originalScene] = await loadScene(id);

    if (originalScene.customProperties.explorerProjectState) {
        const updated = mergeRecursive(originalScene, {
            url: isAdminScene ? scene.id : `${sceneId}:${scene.id}`,
            customProperties: {
                explorerProjectState: { renderSettings: { points: { deviation: deviations } } },
            },
        });

        dataApi.putScene(updated);
    } else {
        const settings = originalScene.settings;
        if (settings) {
            await dataApi.putScene({
                ...originalScene,
                url: `${id}:${scene.id}`,
                settings: {
                    ...settings,
                    points: {
                        ...settings.points,
                        deviation: {
                            ...deviations,
                            mode: deviations.mixFactor === 0 ? "off" : deviations.mixFactor === 1 ? "on" : "mix",
                            colors: deviations.colorGradient.knots
                                .map((deviation) => ({ deviation: deviation.position, color: deviation.color }))
                                .sort((a, b) => a.deviation - b.deviation),
                        },
                    },
                },
            });
        }
    }
}

export function updateObjectIds(uiConfig: UiDeviationConfig, objectGroups: ObjectGroup[]): UiDeviationConfig {
    const getGroups = (groupIds: string[]) => {
        const groups = objectGroups.filter((g) => groupIds.includes(g.id));
        const objectIds = new Set<number>();
        for (const group of groups) {
            group.ids.forEach((id) => objectIds.add(id));
        }
        return {
            groupIds,
            objectIds: [...objectIds],
        };
    };

    return {
        ...uiConfig,
        profiles: uiConfig.profiles.map((profile) => {
            return {
                ...profile,
                subprofiles: profile.subprofiles.map((sp) => {
                    return {
                        ...sp,
                        from: getGroups(sp.from.groupIds),
                        to: getGroups(sp.to.groupIds),
                    };
                }),
            };
        }),
    };
}
