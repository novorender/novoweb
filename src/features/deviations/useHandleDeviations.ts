import { useLazyGetDeviationProfilesQuery } from "apis/dataV2/dataV2Api";
import { ColorStop, DeviationProjectConfig } from "apis/dataV2/deviationTypes";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { renderActions, selectDeviations, selectPoints } from "features/render";
import { selectProjectIsV2 } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";
import { getAssetUrl } from "utils/misc";

import { deviationsActions, selectDeviationProfiles, selectSelectedProfile } from "./deviationsSlice";
import { DeviationType, UiDeviationConfig, UiDeviationProfile } from "./deviationTypes";

const EMPTY_ARRAY: ColorStop[] = [];

export function useHandleDeviations() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const isProjectV2 = useAppSelector(selectProjectIsV2);
    const projectId = view?.renderState.scene?.config.id;
    const profiles = useAppSelector(selectDeviationProfiles);
    const dispatch = useAppDispatch();
    const points = useAppSelector(selectPoints);
    const defaultColorStops = points.deviation.colorGradient.knots ?? EMPTY_ARRAY;
    const profile = useAppSelector(selectSelectedProfile);
    const deviation = useAppSelector(selectDeviations);

    const [getDeviationProfiles] = useLazyGetDeviationProfilesQuery();

    useEffect(() => {
        initDeviationProfiles();

        async function initDeviationProfiles() {
            if (!view || !projectId || profiles.status !== AsyncStatus.Initial) {
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
                              .then((data) => configToUi(data, defaultColorStops))
                        : undefined,
                ]);

                let config: UiDeviationConfig;
                if (configV1 && configV2) {
                    config = configV2;
                    matchProfileIndexes(configV2, configV1);
                } else if (configV1) {
                    config = configToUi(configV1, defaultColorStops);
                } else if (configV2) {
                    config = configV2;
                } else {
                    config = getEmptyDeviationConfig();
                }

                dispatch(
                    deviationsActions.setProfiles({
                        status: AsyncStatus.Success,
                        data: config,
                    })
                );

                const selectedProfile = config.profiles.find((p) => p.index === points.deviation.index);
                if (selectedProfile) {
                    dispatch(deviationsActions.setSelectedProfileId(selectedProfile.id));
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
        isProjectV2,
        projectId,
        profiles,
        defaultColorStops,
        getDeviationProfiles,
        points.deviation.index,
    ]);

    const colorStops = profile?.colors!.colorStops;

    // Set current deviation and colors
    useEffect(() => {
        if (profile && colorStops) {
            dispatch(
                renderActions.setPoints({
                    deviation: {
                        index: profile.index,
                        colorGradient: {
                            knots: colorStops.slice(),
                        },
                    },
                })
            );
        }
    }, [dispatch, profile, colorStops]);

    // Promote current deviation to render state
    useEffect(
        function handleDeviationChanges() {
            if (!view) {
                return;
            }

            view.modifyRenderState({ points: { deviation } });
        },
        [view, deviation]
    );
}

function getEmptyDeviationConfig(): UiDeviationConfig {
    return {
        version: "1.0",
        rebuildRequired: false,
        profiles: [],
    };
}

function configToUi(config: DeviationProjectConfig, defaultColorStops: ColorStop[]): UiDeviationConfig {
    const defaultColors = {
        absoluteValues: false,
        colorStops: defaultColorStops,
    };
    return {
        version: config.version ?? "1.0",
        rebuildRequired: config.rebuildRequired,
        profiles: [
            ...config.pointToTriangle.groups.map(
                (g) =>
                    ({
                        id: g.id ?? window.crypto.randomUUID(),
                        name: g.name,
                        copyFromProfileId: g.copyFromProfileId,
                        deviationType: DeviationType.PointToTriangle,
                        index: -1,
                        favorites: g.favorites ?? [],
                        colors: g.colors ?? defaultColors,
                        from: g.from ?? {
                            objectIds: g.objectIds,
                            groupIds: g.groupIds,
                        },
                        to: g.to ?? {
                            objectIds: [],
                            groupIds: [],
                        },
                        centerLine: g.centerLine,
                        heightToCeiling: g.heightToCeiling,
                        hasFromAndTo: g.from !== undefined,
                    } as UiDeviationProfile)
            ),
            ...config.pointToPoint.groups.map(
                (g) =>
                    ({
                        id: g.id ?? window.crypto.randomUUID(),
                        name: g.name,
                        copyFromProfileId: g.copyFromProfileId,
                        deviationType: DeviationType.PointToPoint,
                        index: -1,
                        favorites: g.favorites ?? [],
                        colors: g.colors ?? defaultColors,
                        from: g.from,
                        to: g.to,
                        centerLine: g.centerLine,
                        heightToCeiling: g.heightToCeiling,
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

    for (const profile of current.profiles) {
        if (calculatedHasIds) {
            profile.index = calcProfiles.findIndex((p) => p.id === profile.id);
        } else {
            // Best effort - match by name for older versions
            profile.index = calcProfiles.findIndex((p) => p.name === profile.name);
        }
    }
}
