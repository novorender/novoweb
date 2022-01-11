import {
    Box,
    CircularProgress,
    css,
    IconButton,
    List,
    ListItem,
    styled,
    tooltipClasses,
    TooltipProps,
    Typography,
    useTheme,
} from "@mui/material";
import { Scene } from "@novorender/webgl-api";
import { Fragment, useCallback, useEffect, MouseEvent } from "react";
import { Internal } from "@novorender/webgl-api";
import { VrpanoOutlined } from "@mui/icons-material";

import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { ScrollBox, Divider, WidgetContainer, WidgetHeader, LogoSpeedDial } from "components";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useToggle } from "hooks/useToggle";
import { store, useAppDispatch, useAppSelector } from "app/store";
import { PanoramaType, selectPanoramas } from "./panoramaSlice";
import { panoramasActions, PanoramaStatus, selectPanoramaStatus } from ".";

const ImgTooltip = styled(({ className, ...props }: TooltipProps) => (
    <ImgTooltip {...props} classes={{ popper: className }} />
))(
    ({ theme }) => css`
        & .${tooltipClasses.tooltip} {
            max-width: none;
            background: ${theme.palette.common.white};
            padding: ${theme.spacing(1)};
            border-radius: 4px;
            border: 1px solid ${theme.palette.grey.A400};
        }
    `
);

const Img = styled("img")(
    () => css`
        height: 100%;
        width: 100%;
        object-fit: cover;
        display: block;
    `
);

let storedMBM:
    | {
          rotate: number;
          pan: number;
          orbit: number;
          pivot: number;
      }
    | undefined;
const storedSettings = {
    hidePoints: false,
    hideTriangles: false,
};

export function Panoramas() {
    const {
        state: { scene, view },
    } = useExplorerGlobals(true);

    const panoramas = useAppSelector(selectPanoramas);
    const [menuOpen, toggleMenu] = useToggle();

    useEffect(() => {
        return function cleanup() {
            if (storedMBM) {
                view.camera.controller.mouseButtonsMap = storedMBM;
                storedMBM = undefined;
                const rse = view.settings as Internal.RenderSettingsExt;
                rse.advanced.hidePoints = storedSettings.hidePoints;
                rse.advanced.hideTriangles = storedSettings.hideTriangles;
            }
        };
    }, [view]);

    useEffect(() => {
        if (!panoramas) {
            loadPanoramas(scene);
        }
    }, [panoramas, scene]);

    return (
        <>
            <WidgetContainer>
                <WidgetHeader widget={featuresConfig.panoramas} />
                <ScrollBox display={!menuOpen ? "block" : "none"} height={1} pb={2}>
                    {panoramas ? (
                        <List>
                            {panoramas.map((panorama, index, array) => (
                                <Fragment key={index}>
                                    <Panorama panorama={panorama} />
                                    {index !== array.length - 1 ? (
                                        <Box my={0.5} component="li">
                                            <Divider />
                                        </Box>
                                    ) : null}
                                </Fragment>
                            ))}
                        </List>
                    ) : null}
                </ScrollBox>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.panoramas.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.panoramas.key}-widget-menu-fab`}
                ariaLabel="toggle widget menu"
            />
        </>
    );
}

function Panorama({ panorama }: { panorama: PanoramaType }) {
    const theme = useTheme();

    const {
        state: { view, scene },
    } = useExplorerGlobals(true);
    const dispatch = useAppDispatch();
    const status = useAppSelector(selectPanoramaStatus);

    const isCurrent = Array.isArray(status) && status[1] === panorama.guid;
    const loading = isCurrent && status[0] === PanoramaStatus.Loading;

    const viewPanorama = useCallback(
        async (ev: MouseEvent<HTMLButtonElement>) => {
            ev.stopPropagation();

            if (storedMBM) {
                const rse = view.settings as Internal.RenderSettingsExt;
                rse.advanced.hidePoints = storedSettings.hidePoints;
                rse.advanced.hideTriangles = storedSettings.hideTriangles;
            }

            if (status === PanoramaStatus.Initial) {
                storedMBM = view.camera.controller.mouseButtonsMap;
                view.camera.controller.mouseButtonsMap = { rotate: 15, pan: 0, orbit: 0, pivot: 0 };
            }

            dispatch(panoramasActions.setStatus([PanoramaStatus.Loading, panorama.guid]));
        },
        [panorama, dispatch, view, status]
    );

    function handleSelect() {
        if (storedMBM) {
            view.camera.controller.mouseButtonsMap = storedMBM;
            storedMBM = undefined;
            const rse = view.settings as Internal.RenderSettingsExt;
            rse.advanced.hidePoints = storedSettings.hidePoints;
            rse.advanced.hideTriangles = storedSettings.hideTriangles;
        }

        dispatch(panoramasActions.setStatus(PanoramaStatus.Initial));

        /* if (activePanorama !== panorama) {
            view.camera.controller.moveTo(panorama.position, panorama.rotation);
        } */
    }

    const url = new URL((scene as any).assetUrl);
    url.pathname += panorama.preview;

    return (
        <ListItem sx={{ padding: `${theme.spacing(0.5)} ${theme.spacing(1)}` }} button onClick={handleSelect}>
            <Box width={1} maxHeight={80} display="flex" alignItems="flex-start" overflow="hidden">
                <Box bgcolor={theme.palette.grey[200]} height={52} width={80} flexShrink={0} flexGrow={0}>
                    <Img src={url.toString()} />
                </Box>
                <Box ml={1} flexDirection="column" flexGrow={1} width={0}>
                    <Typography noWrap variant="body1" sx={{ fontWeight: 600 }}>
                        {panorama.name}
                    </Typography>
                    <Typography noWrap variant="body1" sx={{ fontStyle: "italic" }}>
                        {panorama.guid}
                    </Typography>
                </Box>
                <IconButton
                    size="large"
                    onClick={viewPanorama}
                    disabled={isCurrent}
                    sx={{ position: "relative", verticalAlign: "middle" }}
                >
                    <VrpanoOutlined fontSize="inherit" color={isCurrent ? "primary" : undefined} />
                    {loading ? (
                        <CircularProgress
                            size={52}
                            sx={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                zIndex: 1,
                            }}
                        />
                    ) : undefined}
                </IconButton>
            </Box>
        </ListItem>
    );
}

async function loadPanoramas(scene: Scene) {
    const panoramas: PanoramaType[] = [];

    for await (const p of scene.search({
        searchPattern: [{ property: "Panorama/Preview", value: [], exact: true }],
        full: true,
    })) {
        const panorama = await p.loadMetaData();
        const name = panorama.name;
        const guid = panorama.properties.filter((pr) => pr[0] === "GUID")[0][1];
        const position = JSON.parse(panorama.properties.filter((pr) => pr[0] === "Panorama/Position")[0][1]);
        const rotation = JSON.parse(panorama.properties.filter((pr) => pr[0] === "Panorama/Rotation")[0][1]);
        const preview = panorama.properties.filter((pr) => pr[0] === "Panorama/Preview")[0][1];
        const gltf = panorama.properties.filter((pr) => pr[0] === "Panorama/Gltf")[0][1];

        panoramas.push({ name, guid, position, rotation, preview, gltf });
    }

    store.dispatch(panoramasActions.setPanoramas(panoramas));
}
