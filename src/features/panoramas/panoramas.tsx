import {
    Box,
    Button,
    CircularProgress,
    css,
    FormControlLabel,
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
import { Fragment, useEffect, MouseEvent } from "react";
import { CancelPresentation, VrpanoOutlined } from "@mui/icons-material";

import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import {
    ScrollBox,
    Divider,
    WidgetContainer,
    WidgetHeader,
    LogoSpeedDial,
    IosSwitch,
    LinearProgress,
} from "components";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useToggle } from "hooks/useToggle";
import { store, useAppDispatch, useAppSelector } from "app/store";
import { PanoramaType, selectPanoramas } from "./panoramaSlice";
import { panoramasActions, PanoramaStatus, selectPanoramaStatus, selectShow3dMarkers } from ".";
import { CameraType, renderActions } from "slices/renderSlice";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

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

export function Panoramas() {
    const {
        state: { scene },
    } = useExplorerGlobals(true);

    const panoramas = useAppSelector(selectPanoramas);
    const status = useAppSelector(selectPanoramaStatus);
    const showMarkers = useAppSelector(selectShow3dMarkers);
    const dispatch = useAppDispatch();

    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.panoramas.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.panoramas.key;

    useEffect(() => {
        if (!panoramas) {
            loadPanoramas(scene);
        }
    }, [panoramas, scene]);

    const toggleShowMarkers = () => {
        dispatch(panoramasActions.setShow3dMarkers(!showMarkers));
    };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.panoramas}>
                    {!menuOpen && !minimized && panoramas?.length ? (
                        <Box display="flex">
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={showMarkers}
                                        onChange={toggleShowMarkers}
                                    />
                                }
                                label={<Box fontSize={14}>Show markers</Box>}
                            />
                            <Button
                                color="grey"
                                onClick={() => dispatch(panoramasActions.setStatus(PanoramaStatus.Initial))}
                                disabled={status === PanoramaStatus.Initial}
                            >
                                <CancelPresentation sx={{ mr: 1 }} />
                                Cancel
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                <ScrollBox display={!menuOpen && !minimized ? "block" : "none"} height={1} pb={2}>
                    {panoramas ? (
                        panoramas.length ? (
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
                        ) : (
                            <Typography sx={{ p: 1 }}>Found no panoramas for this scene.</Typography>
                        )
                    ) : (
                        <LinearProgress />
                    )}
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
        state: { scene },
    } = useExplorerGlobals(true);
    const dispatch = useAppDispatch();
    const status = useAppSelector(selectPanoramaStatus);

    const isCurrent = Array.isArray(status) && status[1] === panorama.guid;
    const loading = isCurrent && status[0] === PanoramaStatus.Loading;

    const viewPanorama = (ev: MouseEvent<HTMLButtonElement>) => {
        ev.stopPropagation();
        dispatch(panoramasActions.setStatus([PanoramaStatus.Loading, panorama.guid]));
    };

    function goToScanPosition() {
        dispatch(panoramasActions.setStatus(PanoramaStatus.Initial));
        dispatch(
            renderActions.setCamera({
                type: CameraType.Flight,
                goTo: { position: panorama.position, rotation: panorama.rotation },
            })
        );
    }

    const url = new URL((scene as any).assetUrl);
    url.pathname += panorama.preview;

    return (
        <ListItem sx={{ padding: `${theme.spacing(0.5)} ${theme.spacing(1)}` }} button onClick={goToScanPosition}>
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

    try {
        for await (const p of scene.search({
            searchPattern: [
                { property: "Panorama/Preview", value: "", exact: true },
                { property: "Panorama/Rotation", value: "", exact: true },
                { property: "Panorama/Position", value: "", exact: true },
                { property: "Panorama/Gltf", value: "", exact: true },
            ],
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
    } catch {
        // go on
    }

    store.dispatch(panoramasActions.setPanoramas(panoramas));
}
