import { ObjectDB } from "@novorender/data-js-api";
import { useLazyGetDeviationProfilesQuery } from "apis/dataV2/dataV2Api";
import { ColorStop, DeviationProjectConfig } from "apis/dataV2/deviationTypes";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { renderActions, selectDeviations, selectPoints } from "features/render";
import { useAbortController } from "hooks/useAbortController";
import { selectProjectIsV2 } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";
import { getAssetUrl } from "utils/misc";
import { searchByPatterns } from "utils/search";

import { deviationsActions, selectDeviationProfiles, selectSelectedProfile } from "./deviationsSlice";
import { DeviationType, UiDeviationConfig, UiDeviationProfile } from "./deviationTypes";
import { colorStopSortFn } from "./utils";

const EMPTY_ARRAY: ColorStop[] = [];

export function useHandleDeviations() {
    const {
        state: { view, db },
    } = useExplorerGlobals();
    const isProjectV2 = useAppSelector(selectProjectIsV2);
    const projectId = view?.renderState.scene?.config.id;
    const profiles = useAppSelector(selectDeviationProfiles);
    const dispatch = useAppDispatch();
    const points = useAppSelector(selectPoints);
    const defaultColorStops = points.deviation.colorGradient.knots ?? EMPTY_ARRAY;
    const profile = useAppSelector(selectSelectedProfile);
    const deviation = useAppSelector(selectDeviations);
    const [abortController] = useAbortController();

    const [getDeviationProfiles] = useLazyGetDeviationProfilesQuery();

    useEffect(() => {
        initDeviationProfiles();

        async function initDeviationProfiles() {
            if (!view || !db || !projectId || profiles.status !== AsyncStatus.Initial) {
                return;
            }

            const url = getAssetUrl(view, "deviations.json").toString();

            dispatch(deviationsActions.setProfiles({ status: AsyncStatus.Loading }));

            try {
                const [configV1, configV2] = await Promise.all([
                    fetch(url).then((res) => {
                        if (!res.ok) {
                            return;
                        }

                        return res.json() as Promise<DeviationProjectConfig>;
                    }),
                    isProjectV2
                        ? getDeviationProfiles({ projectId })
                              .unwrap()
                              .then((data) => (data ? configToUi(data, defaultColorStops) : undefined))
                        : undefined,
                ]);

                let config: UiDeviationConfig;
                if (configV1 && configV2) {
                    config = configV2;
                    matchProfileIndexes(configV2, configV1);
                } else if (configV1) {
                    config = configToUi(configV1, defaultColorStops);
                    config.profiles.forEach((p, i) => (p.index = i));
                } else if (configV2) {
                    config = configV2;
                } else {
                    config = getEmptyDeviationConfig();
                }
                config = await withCenterLineObjectIds(db, config, abortController.current);

                dispatch(
                    deviationsActions.setProfiles({
                        status: AsyncStatus.Success,
                        data: config,
                    })
                );

                const selectedProfile = config.profiles.find((p) => p.index === points.deviation.index);
                if (selectedProfile) {
                    dispatch(deviationsActions.setSelectedProfileId(selectedProfile.id));
                } else if (config.profiles.length > 0) {
                    dispatch(deviationsActions.setSelectedProfileId(config.profiles[0].id));
                }
            } catch (e) {
                console.warn(e);
                dispatch(
                    deviationsActions.setProfiles({
                        status: AsyncStatus.Error,
                        msg: "Error loading deviations",
                    })
                );
            }
        }
    }, [
        dispatch,
        view,
        db,
        isProjectV2,
        projectId,
        profiles,
        defaultColorStops,
        getDeviationProfiles,
        points.deviation.index,
        abortController,
    ]);

    // Set current deviation and colors
    useEffect(() => {
        if (profile) {
            let colorStops = profile.colors.colorStops.slice();
            if (profile.colors.absoluteValues) {
                colorStops = accountForAbsValues(colorStops);
            }
            dispatch(
                renderActions.setPoints({
                    deviation: {
                        index: profile.index,
                        colorGradient: {
                            knots: colorStops,
                        },
                    },
                })
            );
        }
    }, [dispatch, profile]);

    // Promote current deviation to render state
    useEffect(
        function handleDeviationChanges() {
            if (!view) {
                return;
            }

            let patchedDeviation = { ...deviation };
            if (deviation.index === -1) {
                patchedDeviation = {
                    ...deviation,
                    index: 0,
                    mixFactor: 0,
                };
            }
            view.modifyRenderState({ points: { deviation: patchedDeviation } });
        },
        [view, deviation]
    );
}

function accountForAbsValues(colorStops: ColorStop[]) {
    const absolute = colorStops.map((cs) => ({ ...cs, position: Math.abs(cs.position) }));
    const negatives = absolute.filter((cs) => cs.position > 0).map((cs) => ({ ...cs, position: -cs.position }));
    return [...absolute, ...negatives].sort(colorStopSortFn);
}

function getEmptyDeviationConfig(): UiDeviationConfig {
    return {
        version: "1.0",
        rebuildRequired: false,
        profiles: [],
    };
}

async function withCenterLineObjectIds(
    db: ObjectDB,
    config: UiDeviationConfig,
    abortController: AbortController
): Promise<UiDeviationConfig> {
    const brepIds = new Set<string>();
    for (const profile of config.profiles) {
        for (const sp of profile.subprofiles) {
            if (sp.centerLine) {
                brepIds.add(sp.centerLine.brepId);
            }
        }
    }

    const idMap = new Map(
        await Promise.all(
            [...brepIds].map(async (brepId) => {
                let objectId = 0;
                await searchByPatterns({
                    db,
                    searchPatterns: [{ property: "Novorender/PathId", value: brepId, exact: true }],
                    callback: (refs) => {
                        if (refs.length > 0) {
                            objectId = refs[0].id;
                        }
                    },
                    abortSignal: abortController.signal,
                });
                return [brepId, objectId] as const;
            })
        )
    );

    return {
        ...config,
        profiles: config.profiles.map((profile) => {
            if (!profile.subprofiles.some((sp) => sp.centerLine)) {
                return profile;
            }

            return {
                ...profile,
                subprofiles: profile.subprofiles.map((sp) => {
                    if (!sp.centerLine) {
                        return sp;
                    }

                    return {
                        ...sp,
                        centerLine: {
                            ...sp.centerLine,
                            objectId: idMap.get(sp.centerLine.brepId)!,
                        },
                    };
                }),
            };
        }),
    };
}

function configToUi(config: DeviationProjectConfig, defaultColorStops: ColorStop[]): UiDeviationConfig {
    const defaultColors = {
        absoluteValues: false,
        colorStops: defaultColorStops,
    };

    let profileIndex = 1;
    return {
        version: config.version ?? "1.0",
        rebuildRequired: config.rebuildRequired,
        runData: config.runData,
        profiles: [
            ...config.pointToTriangle.groups.map(
                (g) =>
                    ({
                        id: g.id ?? window.crypto.randomUUID(),
                        name: g.name ?? `Deviation ${profileIndex++}`,
                        copyFromProfileId: g.copyFromProfileId,
                        deviationType: DeviationType.PointToTriangle,
                        index: -1,
                        favorites: g.favorites ?? [],
                        subprofiles: g.subprofiles ?? [
                            {
                                from: {
                                    objectIds: g.objectIds,
                                    groupIds: g.groupIds,
                                },
                                to: {
                                    objectIds: [],
                                    groupIds: [],
                                },
                            },
                        ],
                        colors: g.colors ?? defaultColors,
                        hasFromAndTo: g.subprofiles !== undefined,
                    } as UiDeviationProfile)
            ),
            ...config.pointToPoint.groups.map(
                (g) =>
                    ({
                        id: g.id ?? window.crypto.randomUUID(),
                        name: g.name ?? `Deviation ${profileIndex++}`,
                        copyFromProfileId: g.copyFromProfileId,
                        deviationType: DeviationType.PointToPoint,
                        index: -1,
                        favorites: g.favorites ?? [],
                        subprofiles: g.subprofiles ?? [
                            {
                                from: g.from,
                                to: g.to,
                            },
                        ],
                        colors: g.colors ?? defaultColors,
                        hasFromAndTo: true,
                    } as UiDeviationProfile)
            ),
        ],
    };
}

function matchProfileIndexes(current: UiDeviationConfig, calculated: DeviationProjectConfig) {
    const calcProfiles = [
        ...calculated.pointToTriangle.groups.map((g) => ({ id: g.id, name: g.name })),
        ...calculated.pointToPoint.groups.map((g) => ({ id: g.id, name: g.name })),
    ];
    const calculatedHasIds = calcProfiles.some((p) => p.id);

    current.profiles.forEach((profile, i) => {
        if (calculatedHasIds) {
            profile.index = calcProfiles.findIndex((p) => p.id === profile.id);
        } else {
            profile.index = i;
        }
    });
}
