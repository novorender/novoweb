import { View } from "@novorender/api";
import { ObjectDB } from "@novorender/data-js-api";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { areArraysEqual } from "features/arcgis/utils";
import { selectDeviations } from "features/render";
import { AsyncStatus } from "types/misc";
import { getObjectData } from "utils/search";

import { deviationsActions, selectDeviationForm, selectDeviationProfiles } from "..";
import { DeviationForm, DeviationType, UiDeviationConfig, UiDeviationProfile } from "../deviationTypes";
import { NEW_DEVIATION_ID } from "../utils";
import { useSaveDeviationConfig } from "./useSaveDeviationConfig";

export function useMergeFormAndSave() {
    const {
        state: { view, db },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();
    const deviationForm = useAppSelector(selectDeviationForm);
    const profiles = useAppSelector(selectDeviationProfiles);
    const deviations = useAppSelector(selectDeviations);
    const saveConfig = useSaveDeviationConfig();

    return useCallback(async () => {
        if (!db || !view || !deviationForm || profiles.status !== AsyncStatus.Success) {
            return;
        }

        dispatch(deviationsActions.setSaveStatus({ status: AsyncStatus.Loading }));
        try {
            const profile = await deviationFormToProfile({
                db,
                view,
                deviationForm: deviationForm,
            });
            const isNew = deviationForm.id === NEW_DEVIATION_ID;
            if (isNew) {
                profile.id = window.crypto.randomUUID();
            }
            const newProfileData = mergeDeviationFormIntoProfiles(profiles.data, profile);

            await saveConfig({
                uiConfig: newProfileData,
                deviations: {
                    ...deviations,
                    colorGradient: {
                        knots: profile.colors.colorStops,
                    },
                },
                showRebuildMessage: false, //newProfileData.rebuildRequired,
            });

            dispatch(deviationsActions.setProfiles({ status: AsyncStatus.Success, data: newProfileData }));
            dispatch(deviationsActions.resetHiddenLegendGroupsForProfile({ profileId: profile.id }));
            dispatch(deviationsActions.setDeviationForm(undefined));

            return newProfileData;
        } catch (ex) {
            console.warn(ex);
            dispatch(
                deviationsActions.setSaveStatus({
                    status: AsyncStatus.Error,
                    msg: "Failed to save deviation profile",
                })
            );
        }
    }, [db, view, profiles, deviationForm, deviations, dispatch, saveConfig]);
}

function mergeDeviationFormIntoProfiles(config: UiDeviationConfig, profile: UiDeviationProfile) {
    const list = [...config.profiles];
    const existingIndex = config.profiles.findIndex((p) => p.id === profile.id);

    let rebuildRequired = config.rebuildRequired;
    if (existingIndex !== -1) {
        const existing = list[existingIndex];
        const typeChanged = existing.deviationType !== profile.deviationType;
        rebuildRequired = rebuildRequired || checkIfRebuildIsRequired(existing, profile);
        if (typeChanged) {
            list.slice(existingIndex, 1);
            list.push(profile);
        } else {
            list[existingIndex] = profile;
        }
    } else {
        rebuildRequired = true;
        list.push(profile);
    }

    return {
        ...config,
        rebuildRequired,
        profiles: [
            ...list.filter((p) => p.deviationType === DeviationType.PointToTriangle),
            ...list.filter((p) => p.deviationType === DeviationType.PointToPoint),
        ],
    } as UiDeviationConfig;
}

async function deviationFormToProfile({
    deviationForm,
    db,
    view,
}: {
    db: ObjectDB;
    view: View;
    deviationForm: DeviationForm;
}): Promise<UiDeviationProfile> {
    const uniqueCenterLineIds = new Set(
        deviationForm.subprofiles
            .filter((sp) => sp.centerLine.enabled && sp.centerLine.id.value)
            .map((sp) => sp.centerLine.id.value!)
    );
    const brepIds = new Map<number, string>();
    if (uniqueCenterLineIds.size > 0) {
        await Promise.all(
            [...uniqueCenterLineIds].map(async (id) => {
                const metadata = await getObjectData({ db: db!, view: view!, id });
                if (metadata) {
                    const brepId = metadata.properties.find((p) => p[0] === "Novorender/PathId")?.[1];
                    if (brepId) {
                        brepIds.set(id, brepId);
                    }
                }
            })
        );
    }

    return {
        id: deviationForm.id,
        name: deviationForm.name.value,
        copyFromProfileId: deviationForm.isCopyingFromProfileId ? deviationForm.copyFromProfileId.value : undefined,
        colors: {
            absoluteValues: deviationForm.colorSetup.absoluteValues,
            colorStops: deviationForm.colorSetup.colorStops.value,
        },
        subprofiles: deviationForm.subprofiles.map((sp) => {
            const brepId = sp.centerLine.id.value ? brepIds.get(sp.centerLine.id.value) : undefined;
            const centerLine =
                sp.centerLine.enabled && brepId
                    ? {
                          brepId,
                          objectId: sp.centerLine.id.value!,
                          parameterBounds: sp.centerLine.parameterBounds.value,
                      }
                    : undefined;

            return {
                centerLine,
                heightToCeiling:
                    centerLine && sp.tunnelInfo.enabled && Number(sp.tunnelInfo.heightToCeiling.value)
                        ? Number(sp.tunnelInfo.heightToCeiling.value)
                        : undefined,
                favorites: sp.favorites.value,
                from: {
                    groupIds: sp.groups1.value,
                    // Object IDs are populated on save
                    objectIds: [] as number[],
                },
                to: {
                    groupIds: sp.groups2.value,
                    objectIds: [] as number[],
                },
            };
        }),
        hasFromAndTo: deviationForm.hasFromAndTo,
        deviationType: deviationForm.deviationType.value,
        index: deviationForm.index,
    };
}

function checkIfRebuildIsRequired(prev: UiDeviationProfile, next: UiDeviationProfile) {
    return (
        prev.deviationType !== next.deviationType ||
        prev.subprofiles.length !== next.subprofiles.length ||
        prev.subprofiles.some((spPrev, i) => {
            const spNext = next.subprofiles[i];
            return (
                !areGroupsIdsEqual(spPrev.from.groupIds, spNext.from.groupIds) ||
                !areGroupsIdsEqual(spPrev.to.groupIds, spNext.to.groupIds) ||
                spPrev.centerLine?.brepId !== spNext.centerLine?.brepId ||
                !areArraysEqual(
                    spPrev.centerLine?.parameterBounds || ([] as number[]),
                    spNext.centerLine?.parameterBounds ?? []
                ) ||
                spPrev.heightToCeiling !== spNext.heightToCeiling
            );
        })
    );
}

function areGroupsIdsEqual(a: string[], b: string[]) {
    return a.every((e) => b.includes(e));
}
