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
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { Scene } from "@novorender/webgl-api";
import { quat, vec3 } from "gl-matrix";
import React, { Fragment, useCallback, useEffect } from "react";
import { useMountedState } from "hooks/useMountedState";
import { ScrollBox, Divider, WidgetContainer, WidgetHeader, LogoSpeedDial } from "components";
import { DynamicObject, Internal } from "@novorender/webgl-api";
import { api } from "app";
import { VrpanoOutlined } from "@mui/icons-material";
import { sleep } from "utils/timers";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";

interface IPanorama {
    name: string;
    guid: string;
    position: vec3;
    rotation: quat;
    preview: string;
    gltf: string;
}

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

type PanoramaProps = {
    panorama: IPanorama;
    active: IPanorama | undefined;
    setActive: React.Dispatch<React.SetStateAction<IPanorama | undefined>>;
};

function Panorama({ panorama, active, setActive }: PanoramaProps) {
    const theme = useTheme();

    const {
        state: { view, scene },
    } = useExplorerGlobals(true);

    const [loading, setLoading] = useMountedState<boolean>(false);
    const [object, setObject] = useMountedState<DynamicObject | undefined>(undefined);

    useEffect(() => {
        return function cleanup() {
            object?.dispose();
        };
    }, [object]);

    const viewPanorama = useCallback(
        async (ev: React.MouseEvent<HTMLButtonElement>) => {
            ev.stopPropagation();
            if (!object && loading) {
                return;
            }
            if (storedMBM) {
                const rse = view.settings as Internal.RenderSettingsExt;
                rse.advanced.hidePoints = storedSettings.hidePoints;
                rse.advanced.hideTriangles = storedSettings.hideTriangles;
            }
            if (!active) {
                storedMBM = view.camera.controller.mouseButtonsMap;
                view.camera.controller.mouseButtonsMap = { rotate: 15, pan: 0, orbit: 0, pivot: 0 };
            }
            view.camera.controller.moveTo(panorama.position, panorama.rotation);
            let start = Date.now();
            if (view.camera.controller.params.kind === "flight") {
                start += view.camera.controller.params.flightTime * 1000;
            }
            setActive(undefined);
            setLoading(true);
            if (!object) {
                const url = new URL((scene as any).assetUrl);
                url.pathname += panorama.gltf;
                const asset = await api.loadAsset(url);
                if (!asset) {
                    setLoading(false);
                    return;
                }
                const _object = scene.createDynamicObject(asset);
                _object.position = panorama.position;
                setObject(_object);
                const delta = start - Date.now();
                if (delta > 0) {
                    await sleep(delta);
                }
                _object.visible = true;
            } else {
                const delta = start - Date.now();
                if (delta > 0) {
                    await sleep(delta);
                }
                object.visible = true;
            }
            const rse = view.settings as Internal.RenderSettingsExt;
            if (!active) {
                storedSettings.hidePoints = rse.advanced.hidePoints;
                storedSettings.hideTriangles = rse.advanced.hideTriangles;
            }
            rse.advanced.hidePoints = true;
            rse.advanced.hideTriangles = true;
            setLoading(false);
            setActive(panorama);
        },
        [panorama, scene, setActive, view, setLoading, loading, object, setObject, active]
    );

    function handleSelect() {
        if (storedMBM) {
            view.camera.controller.mouseButtonsMap = storedMBM;
            storedMBM = undefined;
            const rse = view.settings as Internal.RenderSettingsExt;
            rse.advanced.hidePoints = storedSettings.hidePoints;
            rse.advanced.hideTriangles = storedSettings.hideTriangles;
        }
        setActive(undefined);
        if (active !== panorama) {
            view.camera.controller.moveTo(panorama.position, panorama.rotation);
        }
    }

    if (object) {
        object.visible = active === panorama;
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
                    disabled={active === panorama}
                    sx={{ position: "relative", verticalAlign: "middle" }}
                >
                    <VrpanoOutlined fontSize="inherit" color={active === panorama ? "primary" : undefined} />
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

export function Panoramas() {
    const {
        state: { scene, view },
    } = useExplorerGlobals(true);

    const [menuOpen, toggleMenu] = useToggle();
    const [panoramas, setPanoramas] = useMountedState<IPanorama[]>([]);
    const [active, setActive] = useMountedState<IPanorama | undefined>(undefined);

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
        if (!scene) {
            return;
        }

        loadPanoramas(scene);

        async function loadPanoramas(scene: Scene) {
            const panoramas: IPanorama[] = [];
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
            setPanoramas(panoramas);
        }
    }, [scene, setPanoramas]);

    return (
        <>
            <WidgetContainer>
                <WidgetHeader widget={featuresConfig.panoramas} />
                <ScrollBox display={!menuOpen ? "block" : "none"} height={1} pb={2}>
                    <List>
                        {panoramas.map((panorama, index, array) => (
                            <Fragment key={index}>
                                <Panorama panorama={panorama} active={active} setActive={setActive} />
                                {index !== array.length - 1 ? (
                                    <Box my={0.5} component="li">
                                        <Divider />
                                    </Box>
                                ) : null}
                            </Fragment>
                        ))}
                    </List>
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
