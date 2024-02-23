import { Clear, Edit, Error, FilterList, FlightTakeoff, MoreVert, OpenInNew } from "@mui/icons-material";
import {
    Box,
    Button,
    Checkbox,
    CircularProgress,
    css,
    IconButton,
    LinearProgress,
    Link,
    List,
    ListItemButton,
    ListItemButtonProps,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    styled,
    Tooltip,
    Typography,
    useTheme,
} from "@mui/material";
import { rotationFromDirection } from "@novorender/api";
import { BoundingSphere } from "@novorender/webgl-api";
import { useGetProjectInfoQuery } from "apis/dataV2/dataV2Api";
import { vec3 } from "gl-matrix";
import { useCallback, useState } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Accordion, AccordionDetails, AccordionSummary, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraType, renderActions } from "features/render";
import { selectHasAdminCapabilities } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";

import {
    arcgisActions,
    FeatureLayerState,
    FeatureServerConfig,
    FeatureServerState,
    selectArcgisFeatureServers,
    selectArcgisWidgetConfig,
} from "../arcgisSlice";
import { useIsCameraSetCorrectly } from "../hooks/useIsCameraSetCorrectly";
import { aabb2ToBoundingSphere, getTotalAabb2, isSuitableCameraForArcgis, makeWhereStatement } from "../utils";

export function FeatureServerList() {
    const theme = useTheme();
    const config = useAppSelector(selectArcgisWidgetConfig);
    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const dispatch = useAppDispatch();
    const history = useHistory();
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const projectId = useExplorerGlobals(true).state.scene.id;
    const {
        data: projectInfo,
        error: projectInfoError,
        isLoading: isLoadingProjectInfo,
    } = useGetProjectInfoQuery({ projectId });
    const isCameraSetCorrectly = useIsCameraSetCorrectly(isSuitableCameraForArcgis);
    const {
        state: { view },
    } = useExplorerGlobals();

    const handleFeatureCheck = useCallback(
        (url: string, checked: boolean) => {
            dispatch(arcgisActions.checkFeature({ url, checked }));
        },
        [dispatch]
    );

    const handleLayerCheck = useCallback(
        (url: string, layerId: number, checked: boolean) => {
            dispatch(arcgisActions.checkFeatureLayer({ url, layerId, checked }));
        },
        [dispatch]
    );

    const handleFlyToFeatureServer = useCallback(
        (featureServer: FeatureServerState) => {
            if (!view) {
                return;
            }

            const aabbs = featureServer.layers
                .filter((l) => l.checked && l.details.status === AsyncStatus.Success && l.aabb)
                .map((l) => l.aabb!);

            if (aabbs.length === 0) {
                return;
            }

            const totalAabb2 = getTotalAabb2(aabbs);

            const boundingSphere = ensureBoundingSphereMinRadius(aabb2ToBoundingSphere(totalAabb2));

            setCamera(dispatch, boundingSphere);
        },
        [dispatch, view]
    );

    const handleFlyToLayer = useCallback(
        (layer: FeatureLayerState) => {
            if (!layer.aabb) {
                return;
            }

            const boundingSphere = ensureBoundingSphereMinRadius(aabb2ToBoundingSphere(layer.aabb));
            setCamera(dispatch, boundingSphere);
        },
        [dispatch]
    );

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />

            {config.status === AsyncStatus.Loading || isLoadingProjectInfo ? (
                <Box>
                    <LinearProgress />
                </Box>
            ) : config.status === AsyncStatus.Error ? (
                <Box p={1} pt={2}>
                    {config.msg}
                </Box>
            ) : projectInfoError ? (
                <Box p={1} pt={2}>
                    Error loading project info
                </Box>
            ) : projectInfo && !projectInfo.epsg ? (
                <Box p={1} pt={2}>
                    EPSG is not defined for the project
                </Box>
            ) : config.status === AsyncStatus.Success && config.data.featureServers.length === 0 ? (
                <Box sx={{ m: 4, textAlign: "center" }}>
                    <Box>No feature servers added</Box>
                    <Button
                        type="button"
                        sx={{ mt: 2 }}
                        size="large"
                        variant="outlined"
                        color="primary"
                        onClick={() => history.push("/edit")}
                        disabled={!isAdmin}
                    >
                        Add
                    </Button>
                </Box>
            ) : config.status === AsyncStatus.Success ? (
                <>
                    {!isCameraSetCorrectly &&
                        config.status === AsyncStatus.Success &&
                        config.data.featureServers.length > 0 && (
                            <Box p={1} pt={2} textAlign="center">
                                <Typography variant="subtitle1">
                                    Layers are only visible in top-down 2D view.
                                </Typography>
                            </Box>
                        )}

                    <ScrollBox display="flex" flexDirection="column" height={1} pt={1} pb={2}>
                        {featureServers.map((featureServer) => {
                            const fsConfig = config.data.featureServers.find((cfg) => cfg.url === featureServer.url)!;

                            return (
                                <FeatureServerItem
                                    key={fsConfig.id}
                                    defaultExpanded={featureServers.length === 1}
                                    featureConfig={fsConfig}
                                    featureServer={featureServer}
                                    onCheckFeature={handleFeatureCheck}
                                    onCheckLayer={handleLayerCheck}
                                    flyToFeatureServer={handleFlyToFeatureServer}
                                    flyToLayer={handleFlyToLayer}
                                    isAdmin={isAdmin}
                                />
                            );
                        })}
                    </ScrollBox>
                </>
            ) : null}
        </>
    );
}

function FeatureServerItem({
    defaultExpanded,
    featureConfig,
    featureServer,
    onCheckFeature,
    onCheckLayer,
    flyToFeatureServer,
    flyToLayer,
    isAdmin,
}: {
    defaultExpanded: boolean;
    featureConfig: FeatureServerConfig;
    featureServer: FeatureServerState;
    onCheckFeature: (url: string, checked: boolean) => void;
    onCheckLayer: (url: string, layerId: number, checked: boolean) => void;
    flyToFeatureServer: (featureServer: FeatureServerState) => void;
    flyToLayer: (layer: FeatureLayerState) => void;
    isAdmin: boolean;
}) {
    const history = useHistory();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const { meta, layers } = featureServer;

    const openMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget.parentElement);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const canFlyTo = layers.some((l) => l.checked && l.details.status === AsyncStatus.Success && l.aabb);

    return (
        <Accordion defaultExpanded={defaultExpanded}>
            <AccordionSummary>
                <Box width={0} flex="1 1 auto" overflow="hidden">
                    <Tooltip title={featureConfig.name}>
                        <Box fontWeight={600} overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                            {featureConfig.name}
                        </Box>
                    </Tooltip>
                </Box>

                {meta.status === AsyncStatus.Error ? (
                    <Box flex="0 0 auto" display="flex">
                        <Tooltip title={meta.msg}>
                            <StyledError />
                        </Tooltip>
                    </Box>
                ) : meta.status === AsyncStatus.Loading ? (
                    <Box flex="0 0 auto" display="flex">
                        <CircularProgress size="1rem" />
                    </Box>
                ) : null}

                {canFlyTo && (
                    <Box
                        flex="0 0 auto"
                        onClick={(e) => {
                            e.stopPropagation();
                            flyToFeatureServer(featureServer);
                        }}
                    >
                        <IconButton size="small" sx={{ py: 0 }}>
                            <FlightTakeoff />
                        </IconButton>
                    </Box>
                )}

                <Box flex="0 0 auto">
                    <StyledCheckbox
                        name="toggle group highlighting"
                        aria-label="toggle group highlighting"
                        sx={{ marginLeft: "auto" }}
                        size="small"
                        onClick={(event) => event.stopPropagation()}
                        onFocus={(event) => event.stopPropagation()}
                        checked={layers.length > 0 && layers.every((l) => l.checked)}
                        indeterminate={layers.some((l) => l.checked) && !layers.every((l) => l.checked)}
                        onChange={(e) => onCheckFeature(featureConfig.url, e.target.checked)}
                        disabled={meta.status !== AsyncStatus.Success}
                    />
                </Box>

                <Box flex="0 0 auto">
                    <IconButton
                        color={menuAnchor ? "primary" : "default"}
                        size="small"
                        sx={{ py: 0 }}
                        aria-haspopup="true"
                        onClick={openMenu}
                    >
                        <MoreVert />
                    </IconButton>
                </Box>

                <Menu
                    onClick={(e) => e.stopPropagation()}
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={closeMenu}
                    id={`${featureConfig.url}-menu`}
                    MenuListProps={{ sx: { maxWidth: "100%" } }}
                >
                    <MenuItem href={featureConfig.url} target="_blank">
                        <ListItemIcon>
                            <OpenInNew fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>
                            <Link href={featureConfig.url} target="_blank" underline="none" color="inherit">
                                Open
                            </Link>
                        </ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => history.push("/edit", { url: featureConfig.url })} disabled={!isAdmin}>
                        <ListItemIcon>
                            <Edit fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Edit</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => history.push("/remove", { id: featureConfig.id })} disabled={!isAdmin}>
                        <ListItemIcon>
                            <Clear fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Remove</ListItemText>
                    </MenuItem>
                </Menu>
            </AccordionSummary>

            {meta.status === AsyncStatus.Success && (
                <AccordionDetails sx={{ pb: 0 }}>
                    <List sx={{ padding: 0 }}>
                        {layers.map((layer) => (
                            <LayerItem
                                key={layer.meta.id}
                                fsConfig={featureConfig}
                                layer={layer}
                                onCheckLayer={onCheckLayer}
                                flyToLayer={flyToLayer}
                                isAdmin={isAdmin}
                            />
                        ))}
                    </List>
                </AccordionDetails>
            )}
        </Accordion>
    );
}

function LayerItem({
    fsConfig,
    layer,
    onCheckLayer,
    flyToLayer,
    isAdmin,
}: {
    fsConfig: FeatureServerConfig;
    layer: FeatureLayerState;
    onCheckLayer: (url: string, layerId: number, checked: boolean) => void;
    flyToLayer: (layer: FeatureLayerState) => void;
    isAdmin: boolean;
}) {
    const { url } = fsConfig;
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const history = useHistory();

    const openMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget.parentElement);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const onChange = () => onCheckLayer(url, layer.meta.id, !layer.checked);

    const fullWhere = makeWhereStatement(fsConfig, layer);
    const tooltipTitle = (
        <>
            {layer.meta.name}
            {layer.where && <div>Own filter: {layer.where}</div>}
            {fullWhere && <div>Full filter: {fullWhere}</div>}
        </>
    );

    return (
        <>
            <StyledListItemButton disableRipple onClick={onChange}>
                <Box display="flex" width={1} alignItems="center">
                    <Box flex="1 1 auto" overflow="hidden">
                        <Tooltip title={tooltipTitle}>
                            <Typography noWrap={true}>{layer.meta.name}</Typography>
                        </Tooltip>
                    </Box>

                    {layer.details.status === AsyncStatus.Loading ? (
                        <Box flex="0 0 auto" display="flex">
                            <CircularProgress size="1rem" />
                        </Box>
                    ) : layer.details.status === AsyncStatus.Error ? (
                        <Box flex="0 0 auto" display="flex">
                            <Tooltip title={layer.details.msg}>
                                <StyledError />
                            </Tooltip>
                        </Box>
                    ) : null}

                    {layer.checked && layer.details.status === AsyncStatus.Success && layer.aabb && (
                        <Box
                            flex="0 0 auto"
                            onClick={(e) => {
                                e.stopPropagation();
                                flyToLayer(layer);
                            }}
                        >
                            <IconButton size="small" sx={{ py: 0 }}>
                                <FlightTakeoff />
                            </IconButton>
                        </Box>
                    )}

                    <Box flex="0 0 auto">
                        <StyledCheckbox
                            name="toggle group highlighting"
                            aria-label="toggle group highlighting"
                            size="small"
                            checked={layer.checked}
                            onClick={(event) => event.stopPropagation()}
                            onChange={onChange}
                        />
                    </Box>
                    <Box flex="0 0 auto">
                        <IconButton
                            color={menuAnchor ? "primary" : "default"}
                            size="small"
                            sx={{ py: 0 }}
                            aria-haspopup="true"
                            onClick={openMenu}
                        >
                            <MoreVert />
                        </IconButton>
                    </Box>

                    <Menu
                        onClick={(e) => e.stopPropagation()}
                        anchorEl={menuAnchor}
                        open={Boolean(menuAnchor)}
                        onClose={closeMenu}
                        id={`${url}-${layer.meta.id}-menu`}
                        MenuListProps={{ sx: { maxWidth: "100%" } }}
                    >
                        <MenuItem
                            onClick={() => history.push("/layerFilter", { url, layerId: layer.meta.id })}
                            disabled={!isAdmin}
                        >
                            <ListItemIcon>
                                <FilterList fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Filter</ListItemText>
                        </MenuItem>
                    </Menu>
                </Box>
            </StyledListItemButton>
        </>
    );
}

const StyledListItemButton = styled(ListItemButton)<ListItemButtonProps>(
    ({ theme }) => css`
        margin: 0;
        flex-grow: 0;
        padding: ${theme.spacing(0.5)} ${theme.spacing(4)} ${theme.spacing(0.5)} ${theme.spacing(1)};
    `
);

const StyledCheckbox = styled(Checkbox)`
    padding-top: 0;
    padding-bottom: 0;
`;

const StyledError = styled(Error)(
    ({ theme }) => css`
        fill: ${theme.palette.error.main};
    `
);

function ensureBoundingSphereMinRadius(sphere: BoundingSphere, radius = 20): BoundingSphere {
    if (sphere.radius < radius) {
        return {
            center: sphere.center,
            radius,
        };
    }

    return sphere;
}

function setCamera(dispatch: ReturnType<typeof useAppDispatch>, boundingSphere: BoundingSphere) {
    const cameraPos = vec3.fromValues(
        boundingSphere.center[0],
        boundingSphere.center[1],
        boundingSphere.center[2] + 300
    );
    const cameraRotation = rotationFromDirection([0, 0, 1]);

    dispatch(
        renderActions.setCamera({
            type: CameraType.Orthographic,
            goTo: {
                position: cameraPos,
                rotation: cameraRotation,
                fov: boundingSphere.radius * 2,
                flyTime: 0,
            },
        })
    );
}
