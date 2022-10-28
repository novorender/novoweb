import { SceneData } from "@novorender/data-js-api";
import { SpeedDialActionProps, Box, CircularProgress } from "@mui/material";

import { dataApi } from "app";
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
import {
    CameraType,
    renderActions,
    SceneEditStatus,
    selectEditingScene,
    selectHomeCameraPosition,
} from "slices/renderSlice";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useDispatchHighlighted } from "contexts/highlighted";
import { useDispatchHidden } from "contexts/hidden";
import { customGroupsActions, useCustomGroups } from "contexts/customGroups";
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

    const editingScene = useAppSelector(selectEditingScene);
    const homeCameraPos = useAppSelector(selectHomeCameraPosition);
    const { state: customGroups, dispatch: dispatchCustomGroups } = useCustomGroups();
    const dispatchVisible = useDispatchVisible();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const dispatch = useAppDispatch();

    const [status, setStatus] = useMountedState(Status.Initial);

    const disabled = status === Status.Loading || (editingScene && editingScene.status !== SceneEditStatus.Editing);

    const handleClick = async () => {
        setStatus(Status.Loading);

        const {
            settings,
            customProperties,
            objectGroups = [],
            camera = { kind: "flight" },
        } = (await dataApi.loadScene(editingScene?.id || id)) as SceneData;

        dispatch(renderActions.resetState());
        dispatch(measureActions.clear());
        dispatch(areaActions.setPoints([]));
        dispatch(pointLineActions.setPoints([]));
        dispatch(manholeActions.selectObj(undefined));

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
        initHidden(objectGroups, dispatchHidden);
        initHighlighted(objectGroups, dispatchHighlighted);
        initAdvancedSettings(view, customProperties);
        dispatch(panoramasActions.setStatus(PanoramaStatus.Initial));
        initSubtrees(view, scene);

        dispatchCustomGroups(
            customGroupsActions.set(
                [
                    ...customGroups.map((group) => {
                        const originalGrpSettings = objectGroups.find((grp) => group.id === grp.id);

                        group.selected = originalGrpSettings?.selected ?? false;
                        group.hidden = originalGrpSettings?.hidden ?? false;

                        return group;
                    }),
                ].sort(
                    (a, b) =>
                        objectGroups.findIndex((grp) => grp.id === a.id) -
                        objectGroups.findIndex((grp) => grp.id === b.id)
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
