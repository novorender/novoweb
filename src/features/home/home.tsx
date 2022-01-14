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
        state: { view },
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
            bookmarks,
            camera = { kind: "flight" },
        } = await dataApi.loadScene(editingScene?.id || id);

        dispatch(renderActions.resetState());

        if (settings) {
            const { display: _display, environment: _env, light: _light, ...toApply } = settings;

            view.applySettings(toApply);
            initClippingBox(toApply.clippingPlanes);
            initClippingPlanes(toApply.clippingVolume);
            initDeviation(toApply.points.deviation);
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

        dispatchVisible(visibleActions.set([]));
        initHidden(objectGroups, dispatchHidden);
        initHighlighted(objectGroups, dispatchHighlighted);
        initAdvancedSettings(view, customProperties);
        dispatch(renderActions.setBookmarks(bookmarks));
        dispatch(panoramasActions.setStatus(PanoramaStatus.Initial));

        dispatchCustomGroups(
            customGroupsActions.set(
                customGroups.map((group) => {
                    const originalGrpSettings = objectGroups.find((grp) => group.id === grp.id);

                    group.selected = originalGrpSettings?.selected ?? false;
                    group.hidden = originalGrpSettings?.hidden ?? false;

                    return group;
                })
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
