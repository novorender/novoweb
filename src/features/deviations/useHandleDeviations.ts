import { useEffect } from "react";

import { useLazyGetDeviationProfilesQuery } from "apis/dataV2/dataV2Api";
import { ColorStop, DeviationProjectConfig } from "apis/dataV2/deviationTypes";
import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectLandXmlPaths } from "features/followPath";
import { useLoadLandXmlPath } from "features/followPath/hooks/useLoadLandXmlPath";
import { LandXmlPath } from "features/followPath/types";
import { renderActions, selectDeviations, selectPoints, selectViewMode } from "features/render";
import { useAbortController } from "hooks/useAbortController";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { useSceneId } from "hooks/useSceneId";
import { selectProjectIsV2 } from "slices/explorer";
import { AsyncStatus, ViewMode } from "types/misc";
import { getAssetUrl } from "utils/misc";

import { deviationsActions } from "./deviationsSlice";
import { DeviationType, UiDeviationConfig, UiDeviationProfile } from "./deviationTypes";
import { useHighlightDeviation } from "./hooks/useHighlightDeviation";
import { useSetCenterLineFollowPath } from "./hooks/useSetCenterLineFollowPath";
import { selectDeviationProfiles, selectSelectedProfile, selectSelectedProfileId } from "./selectors";
import { accountForAbsValues } from "./utils";

const EMPTY_ARRAY: ColorStop[] = [];

export function useHandleDeviations() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const isProjectV2 = useAppSelector(selectProjectIsV2);
    const sceneId = useSceneId();
    const profiles = useAppSelector(selectDeviationProfiles);
    const selectedProfileId = useAppSelector(selectSelectedProfileId);
    const dispatch = useAppDispatch();
    const points = useAppSelector(selectPoints);
    const defaultColorStops = points.deviation.colorGradient.knots ?? EMPTY_ARRAY;
    const profile = useAppSelector(selectSelectedProfile);
    const deviation = useAppSelector(selectDeviations);
    const [abortController] = useAbortController();
    const active = useAppSelector(selectViewMode) === ViewMode.Deviations;
    const landXmlPaths = useAppSelector(selectLandXmlPaths);
    const checkProjectPermission = useCheckProjectPermission();

    const [getDeviationProfiles] = useLazyGetDeviationProfilesQuery();

    useLoadLandXmlPath();
    useSetCenterLineFollowPath();
    useHighlightDeviation();

    useEffect(() => {
        initDeviationProfiles();

        async function initDeviationProfiles() {
            if (
                !view ||
                !sceneId ||
                profiles.status !== AsyncStatus.Initial ||
                landXmlPaths.status !== AsyncStatus.Success ||
                !checkProjectPermission(Permission.DeviationRead)
            ) {
                return;
            }

            const url = getAssetUrl(view, "deviations.json").toString();

            dispatch(deviationsActions.setProfiles({ status: AsyncStatus.Loading }));

            try {
                // When we run the calculation - saved config is copied to another storage where calculator picks it up, so
                // savedConfig - the one where we save changes
                // commitedConfig - the one picked up (and later updated!) by the service
                const [commitedConfig, savedConfig] = await Promise.all([
                    fetch(url).then((res) => {
                        if (!res.ok) {
                            return;
                        }

                        return res.json() as Promise<DeviationProjectConfig>;
                    }),
                    isProjectV2
                        ? getDeviationProfiles({ projectId: sceneId })
                              .unwrap()
                              .then((data) => (data ? configToUi(data, defaultColorStops) : undefined))
                        : undefined,
                ]);

                if (commitedConfig && savedConfig) {
                    // Commited config always has relevant runData
                    savedConfig.runData = commitedConfig.runData;
                }

                let config: UiDeviationConfig;
                if (commitedConfig && savedConfig) {
                    config = savedConfig;
                    matchProfileIndexes(savedConfig, commitedConfig);
                } else if (commitedConfig) {
                    config = configToUi(commitedConfig, defaultColorStops);
                    config.profiles.forEach((p, i) => (p.index = i));
                } else if (savedConfig) {
                    config = savedConfig;
                } else {
                    config = getEmptyDeviationConfig();
                }
                config = withCenterLineObjectIds(config, landXmlPaths.data);

                dispatch(
                    deviationsActions.setProfiles({
                        status: AsyncStatus.Success,
                        data: config,
                    })
                );

                dispatch(deviationsActions.initFromProfileIndex({ index: points.deviation.index }));
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
        sceneId,
        profiles,
        defaultColorStops,
        getDeviationProfiles,
        points.deviation.index,
        abortController,
        selectedProfileId,
        landXmlPaths,
        checkProjectPermission,
    ]);

    // Set current deviation and colors
    useEffect(() => {
        if (profile && active) {
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
    }, [dispatch, profile, active]);

    // Promote current deviation to render state
    useEffect(
        function handleDeviationChanges() {
            if (!view) {
                return;
            }

            let patchedDeviation = { ...deviation };
            if (deviation.index === -1 || !active) {
                patchedDeviation = {
                    ...deviation,
                    index: 0,
                    mixFactor: 0,
                };
            }
            view.modifyRenderState({ points: { deviation: patchedDeviation } });
        },
        [view, deviation, active]
    );
}

function getEmptyDeviationConfig(): UiDeviationConfig {
    return {
        version: "1.0",
        rebuildRequired: false,
        profiles: [],
    };
}

function withCenterLineObjectIds(config: UiDeviationConfig, landXmlPaths: LandXmlPath[]): UiDeviationConfig {
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
                            objectId: landXmlPaths.find((p) => p.brepId === sp.centerLine!.brepId)?.id ?? 0,
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
            ...config.pointToTriangle.groups.map((g) =>
                populateMissingData({
                    id: g.id ?? window.crypto.randomUUID(),
                    name: g.name ?? `Deviation ${profileIndex++}`,
                    copyFromProfileId: g.copyFromProfileId,
                    deviationType: DeviationType.PointToTriangle,
                    index: -1,
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
                            favorites: g.favorites ?? [],
                            legendGroups: [],
                        },
                    ],
                    colors: g.colors ?? defaultColors,
                    hasFromAndTo: g.subprofiles !== undefined,
                    fromAndToSwapped: false,
                } as UiDeviationProfile)
            ),
            ...config.pointToPoint.groups.map((g) =>
                populateMissingData({
                    id: g.id ?? window.crypto.randomUUID(),
                    name: g.name ?? `Deviation ${profileIndex++}`,
                    copyFromProfileId: g.copyFromProfileId,
                    deviationType: DeviationType.PointToPoint,
                    index: -1,
                    subprofiles: g.subprofiles?.map((sp) => ({
                        ...sp,
                        from: g.fromAndToSwapped ? sp.to : sp.from,
                        to: g.fromAndToSwapped ? sp.from : sp.to,
                    })) ?? [
                        {
                            from: g.fromAndToSwapped ? g.to : g.from,
                            to: g.fromAndToSwapped ? g.from : g.to,
                            favorites: g.favorites ?? [],
                            legendGroups: [],
                        },
                    ],
                    colors: g.colors ?? defaultColors,
                    hasFromAndTo: true,
                    fromAndToSwapped: g.fromAndToSwapped,
                } as UiDeviationProfile)
            ),
        ],
    };
}

function populateMissingData(profile: UiDeviationProfile): UiDeviationProfile {
    return {
        ...profile,
        subprofiles: profile.subprofiles.map((sp) => {
            return {
                ...sp,
                favorites: sp.favorites ?? [],
            };
        }),
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
