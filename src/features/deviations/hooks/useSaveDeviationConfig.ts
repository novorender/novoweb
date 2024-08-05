import { mergeRecursive, SceneConfig } from "@novorender/api";
import { useCallback } from "react";

import { useSaveCustomPropertiesMutation, useSetDeviationProfilesMutation } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { isInternalGroup, ObjectGroup, useObjectGroups } from "contexts/objectGroups";
import { selectDeviations } from "features/render";
import { loadScene } from "features/render/utils";
import { useFillGroupIds } from "hooks/useFillGroupIds";
import { useSceneId } from "hooks/useSceneId";
import { selectIsAdminScene, selectProjectIsV2 } from "slices/explorer";
import { AsyncStatus } from "types/misc";
import { CustomProperties } from "types/project";

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
    const fillGroupIds = useFillGroupIds();
    const [saveCustomProperties] = useSaveCustomPropertiesMutation();

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
                    saveCustomProperties: (data) => saveCustomProperties({ projectId: sceneId, data }).unwrap(),
                });

                if (isProjectV2) {
                    const uiConfigWithObjectIds = await updateObjectIds(fillGroupIds, uiConfig, objectGroups);
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
        [
            dispatch,
            projectId,
            scene,
            sceneId,
            fillGroupIds,
            isAdminScene,
            isProjectV2,
            setDeviationProfiles,
            objectGroups,
            saveCustomProperties,
        ]
    );
}

async function saveExplorerSettings({
    scene,
    sceneId,
    deviations,
    isAdminScene,
    saveCustomProperties,
}: {
    scene: SceneConfig;
    sceneId: string;
    deviations: ReturnType<typeof selectDeviations>;
    isAdminScene: boolean;
    saveCustomProperties: (data: CustomProperties) => Promise<void>;
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

        await saveCustomProperties(updated.customProperties);
    }
}

export async function updateObjectIds(
    fillGroupIds: (groups: ObjectGroup[]) => Promise<void>,
    uiConfig: UiDeviationConfig,
    objectGroups: ObjectGroup[]
): Promise<UiDeviationConfig> {
    const uniqueGroupIds = new Set<string>();
    for (const profile of uiConfig.profiles) {
        for (const sp of profile.subprofiles) {
            for (const id of sp.from.groupIds) {
                uniqueGroupIds.add(id);
            }
            for (const id of sp.to.groupIds) {
                uniqueGroupIds.add(id);
            }
        }
    }

    const activeGroups = objectGroups.filter((g) => uniqueGroupIds.has(g.id));
    await fillGroupIds(activeGroups);

    const getGroups = (groupIds: string[]) => {
        const groups = activeGroups.filter((g) => groupIds.includes(g.id));
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
