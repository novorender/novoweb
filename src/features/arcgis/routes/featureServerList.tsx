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
import { vec3 } from "gl-matrix";
import { useCallback, useState } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app";
import { Accordion, AccordionDetails, AccordionSummary, ScrollBox } from "components";
import { CameraType, renderActions } from "features/render";
import { selectHasAdminCapabilities } from "slices/explorer";
import { AsyncStatus } from "types/misc";

import { arcgisActions, selectArcgisFeatureServers } from "../arcgisSlice";
import { useIsCameraSetCorrectly } from "../hooks/useIsCameraSetCorrectly";
import { useProjectEpsg } from "../hooks/useProjectEpsg";
import { FeatureServer, Layer } from "../types";
import { aabb2ToBoundingSphere, getTotalAabb2, makeWhereStatement } from "../utils";

export function FeatureServerList() {
    const theme = useTheme();
    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const dispatch = useAppDispatch();
    const history = useHistory();
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const epsg = useProjectEpsg({ skip: featureServers.status !== AsyncStatus.Success });
    const isCameraSetCorrectly = useIsCameraSetCorrectly();

    const handleFeatureCheck = useCallback(
        (featureServerId: string, checked: boolean) => {
            dispatch(arcgisActions.checkFeature({ featureServerId, checked }));
        },
        [dispatch]
    );

    const handleLayerCheck = useCallback(
        (featureServerId: string, layerId: number, checked: boolean) => {
            dispatch(arcgisActions.checkFeatureLayer({ featureServerId, layerId, checked }));
        },
        [dispatch]
    );

    const handleFlyToFeatureServer = useCallback(
        (featureServer: FeatureServer) => {
            const aabbs = featureServer.layers
                .filter((l) => l.checked && l.definition.status === AsyncStatus.Success && l.aabb)
                .map((l) => l.aabb!);

            if (aabbs.length === 0) {
                return;
            }

            const totalAabb2 = getTotalAabb2(aabbs);

            const boundingSphere = ensureBoundingSphereMinRadius(aabb2ToBoundingSphere(totalAabb2));

            setCamera(dispatch, boundingSphere);
        },
        [dispatch]
    );

    const handleFlyToLayer = useCallback(
        (layer: Layer) => {
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

            {featureServers.status === AsyncStatus.Loading || epsg.isFetching ? (
                <Box>
                    <LinearProgress />
                </Box>
            ) : featureServers.status === AsyncStatus.Error ? (
                <Box p={1} pt={2}>
                    {featureServers.msg}
                </Box>
            ) : epsg.error ? (
                <Box p={1} pt={2}>
                    Error loading TM Zone info
                </Box>
            ) : !epsg.data ? (
                <Box p={1} pt={2}>
                    TM Zone is not defined for the project
                </Box>
            ) : featureServers.status === AsyncStatus.Success && featureServers.data.length === 0 ? (
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
            ) : featureServers.status === AsyncStatus.Success ? (
                <>
                    {!isCameraSetCorrectly &&
                        featureServers.status === AsyncStatus.Success &&
                        featureServers.data.length > 0 && (
                            <Box p={1} pt={2} textAlign="center">
                                <Typography variant="subtitle1">
                                    Layers are only visible in top-down 2D view.
                                </Typography>
                            </Box>
                        )}

                    <ScrollBox display="flex" flexDirection="column" height={1} pt={1} pb={2}>
                        {featureServers.data.map((featureServer) => {
                            return (
                                <FeatureServerItem
                                    key={featureServer.id}
                                    defaultExpanded={featureServers.data.length === 1}
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
    featureServer,
    onCheckFeature,
    onCheckLayer,
    flyToFeatureServer,
    flyToLayer,
    isAdmin,
}: {
    defaultExpanded: boolean;
    featureServer: FeatureServer;
    onCheckFeature: (featureServerId: string, checked: boolean) => void;
    onCheckLayer: (featureServerId: string, layerId: number, checked: boolean) => void;
    flyToFeatureServer: (featureServer: FeatureServer) => void;
    flyToLayer: (layer: Layer) => void;
    isAdmin: boolean;
}) {
    const history = useHistory();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const { definition, layers } = featureServer;

    const openMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget.parentElement);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const canFlyTo = layers.some((l) => l.checked && l.features.status === AsyncStatus.Success && l.aabb);

    return (
        <Accordion defaultExpanded={defaultExpanded}>
            <AccordionSummary>
                <Box width={0} flex="1 1 auto" overflow="hidden">
                    <Tooltip title={featureServer.name}>
                        <Box fontWeight={600} overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
                            {featureServer.name}
                        </Box>
                    </Tooltip>
                </Box>

                {definition.status === AsyncStatus.Error ? (
                    <Box flex="0 0 auto" display="flex">
                        <Tooltip title={definition.msg}>
                            <StyledError />
                        </Tooltip>
                    </Box>
                ) : definition.status === AsyncStatus.Loading ? (
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
                        onChange={(e) => onCheckFeature(featureServer.id, e.target.checked)}
                        disabled={definition.status !== AsyncStatus.Success}
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
                    id={`${featureServer.id}-menu`}
                    MenuListProps={{ sx: { maxWidth: "100%" } }}
                >
                    <MenuItem href={featureServer.url} target="_blank">
                        <ListItemIcon>
                            <OpenInNew fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>
                            <Link href={featureServer.url} target="_blank" underline="none" color="inherit">
                                Open
                            </Link>
                        </ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => history.push("/edit", { id: featureServer.id })} disabled={!isAdmin}>
                        <ListItemIcon>
                            <Edit fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Edit</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => history.push("/remove", { id: featureServer.id })} disabled={!isAdmin}>
                        <ListItemIcon>
                            <Clear fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Remove</ListItemText>
                    </MenuItem>
                </Menu>
            </AccordionSummary>

            {definition.status === AsyncStatus.Success && (
                <AccordionDetails sx={{ pb: 0 }}>
                    <List sx={{ padding: 0 }}>
                        {layers.map((layer) => (
                            <LayerItem
                                key={layer.id}
                                featureServer={featureServer}
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
    featureServer,
    layer,
    onCheckLayer,
    flyToLayer,
    isAdmin,
}: {
    featureServer: FeatureServer;
    layer: Layer;
    onCheckLayer: (featureServerId: string, layerId: number, checked: boolean) => void;
    flyToLayer: (layer: Layer) => void;
    isAdmin: boolean;
}) {
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const history = useHistory();

    const openMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget.parentElement);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const onChange = () => onCheckLayer(featureServer.id, layer.id, !layer.checked);

    const fullWhere = makeWhereStatement(featureServer, layer);
    const tooltipTitle = (
        <>
            {layer.name}
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
                            <Typography noWrap={true}>{layer.name}</Typography>
                        </Tooltip>
                    </Box>

                    {layer.definition.status === AsyncStatus.Loading ||
                    layer.features.status === AsyncStatus.Loading ? (
                        <Box flex="0 0 auto" display="flex">
                            <CircularProgress size="1rem" />
                        </Box>
                    ) : layer.definition.status === AsyncStatus.Error ? (
                        <Box flex="0 0 auto" display="flex">
                            <Tooltip title={layer.definition.msg}>
                                <StyledError />
                            </Tooltip>
                        </Box>
                    ) : layer.features.status === AsyncStatus.Error ? (
                        <Box flex="0 0 auto" display="flex">
                            <Tooltip title={layer.features.msg}>
                                <StyledError />
                            </Tooltip>
                        </Box>
                    ) : null}

                    {layer.checked &&
                        layer.features.status === AsyncStatus.Success &&
                        layer.definition.status === AsyncStatus.Success &&
                        layer.aabb && (
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
                        id={`${featureServer.id}-${layer.id}-menu`}
                        MenuListProps={{ sx: { maxWidth: "100%" } }}
                    >
                        <MenuItem
                            onClick={() =>
                                history.push("/layerFilter", { featureServerId: featureServer.id, layerId: layer.id })
                            }
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
