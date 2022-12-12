import { SceneData } from "@novorender/data-js-api";
import { SpeedDialActionProps, Box, CircularProgress } from "@mui/material";

import { api, dataApi } from "app";
import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import {
    initAdvancedSettings,
    initClippingBox,
    initClippingPlanes,
    initDeviation,
    initHidden,
    initHighlighted,
    initSubtrees,
} from "features/render/utils";
import { panoramasActions, PanoramaStatus } from "features/panoramas";
import { useMountedState } from "hooks/useMountedState";
import { useSceneId } from "hooks/useSceneId";

import { useAppDispatch, useAppSelector } from "app/store";
import { CameraType, renderActions, selectAdvancedSettings, selectHomeCameraPosition } from "slices/renderSlice";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useDispatchHighlighted } from "contexts/highlighted";
import { useDispatchHidden } from "contexts/hidden";
import { objectGroupsActions, useDispatchObjectGroups, useLazyObjectGroups } from "contexts/objectGroups";
import { useDispatchVisible, visibleActions } from "contexts/visible";
import { measureActions } from "features/measure";
import { areaActions } from "features/area";
import { pointLineActions } from "features/pointLine";
import { manholeActions } from "features/manhole";

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
};

enum Status {
    Initial,
    Loading,
}

export function Home({ position, ...speedDialProps }: Props) {
    const id = useSceneId();
    const {
        state: { view, scene },
    } = useExplorerGlobals(true);

    const { name, Icon } = featuresConfig["home"];

    const homeCameraPos = useAppSelector(selectHomeCameraPosition);
    const { triangleLimit } = useAppSelector(selectAdvancedSettings);
    const objectGroups = useLazyObjectGroups();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const dispatchVisible = useDispatchVisible();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const dispatch = useAppDispatch();

    const [status, setStatus] = useMountedState(Status.Initial);

    const disabled = status === Status.Loading;

    const handleClick = async () => {
        setStatus(Status.Loading);

        const {
            settings,
            customProperties,
            objectGroups: savedObjectGroups = [],
            camera = { kind: "flight" },
        } = (await dataApi.loadScene(id)) as SceneData;

        dispatch(renderActions.resetState());
        dispatch(measureActions.clear());
        dispatch(areaActions.setPoints([]));
        dispatch(pointLineActions.setPoints([]));
        dispatch(manholeActions.initFromBookmark(undefined));

        if (settings) {
            const { display: _display, environment: _env, light: _light, ...toApply } = settings;

            if (toApply.terrain.asBackground === undefined) {
                toApply.terrain.asBackground = false;
            }

            view.applySettings(toApply);
            initClippingBox(toApply.clippingPlanes);
            initClippingPlanes(toApply.clippingVolume ?? { enabled: false, mode: "union", planes: [] });
            initDeviation(toApply.points.deviation ?? { mode: "off", colors: [] });
        }

        if (camera.kind === "ortho") {
            dispatch(renderActions.setCamera({ type: CameraType.Orthographic, params: camera }));
        } else {
            dispatch(
                renderActions.setCamera({
                    type: CameraType.Flight,
                    goTo: homeCameraPos,
                })
            );
        }

        const cameraSpeed = (camera as { linearVelocity?: number }).linearVelocity;
        if (cameraSpeed !== undefined) {
            dispatch(renderActions.setBaseCameraSpeed(cameraSpeed));
        }

        dispatchVisible(visibleActions.set([]));
        initHidden(savedObjectGroups, dispatchHidden);
        initHighlighted(savedObjectGroups, dispatchHighlighted);
        initAdvancedSettings(view, { ...customProperties, triangleLimit }, api);
        dispatch(panoramasActions.setStatus(PanoramaStatus.Initial));
        initSubtrees(view, scene);

        dispatchObjectGroups(
            objectGroupsActions.set(
                [
                    ...objectGroups.current.map((group) => {
                        const originalGrpSettings = savedObjectGroups.find((grp) => group.id === grp.id);

                        group.selected = originalGrpSettings?.selected ?? false;
                        group.hidden = originalGrpSettings?.hidden ?? false;

                        return group;
                    }),
                ].sort(
                    (a, b) =>
                        savedObjectGroups.findIndex((grp) => grp.id === a.id) -
                        savedObjectGroups.findIndex((grp) => grp.id === b.id)
                )
            )
        );

        setStatus(Status.Initial);
    };

    return (
        <SpeedDialAction
            {...speedDialProps}
            data-test="home"
            FabProps={{
                disabled,
                ...speedDialProps.FabProps,
                style: { ...position, position: "absolute" },
            }}
            onClick={handleClick}
            title={name}
            icon={
                <Box
                    width={1}
                    height={1}
                    position="relative"
                    display="inline-flex"
                    justifyContent="center"
                    alignItems="center"
                >
                    {status === Status.Loading ? (
                        <CircularProgress thickness={2.5} sx={{ position: "absolute" }} />
                    ) : null}
                    <Icon />
                </Box>
            }
        />
    );
}
