import {
    CropLandscape,
    Height,
    Layers,
    LayersClear,
    RouteOutlined,
    Straighten,
    VisibilityOff,
} from "@mui/icons-material";
import { Box, CircularProgress, ListItemIcon, ListItemText, MenuItem, Tab, Tabs, Typography } from "@mui/material";
import { MeasureEntity, View } from "@novorender/api";
import { ObjectDB } from "@novorender/data-js-api";
import { HierarcicalObjectReference } from "@novorender/webgl-api";
import { ReadonlyVec4, vec2, vec3, vec4 } from "gl-matrix";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress } from "components";
import { canvasContextMenuConfig, canvasContextMenuConfig as config } from "config/canvasContextMenu";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { hiddenActions, useDispatchHidden } from "contexts/hidden";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { selectionBasketActions, useDispatchSelectionBasket } from "contexts/selectionBasket";
import { areaActions } from "features/area";
import { measureActions, selectMeasureEntities, selectMeasurePickSettings } from "features/measure";
import {
    clippingOutlineLaserActions,
    getOutlineLaser,
    OutlineLaser,
    selectOutlineLaser3d,
    selectOutlineLaserPlane,
} from "features/outlineLaser";
import { pointLineActions, selectLockPointLineElevation } from "features/pointLine";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { selectCanvasContextMenuFeatures } from "slices/explorer";
import { AsyncStatus } from "types/misc";
import { getPerpendicular } from "utils/math";
import {
    getFileNameFromPath,
    getFilePathFromObjectPath,
    getObjectMetadataRotation,
    getParentPath,
} from "utils/objectData";
import { getObjectData, searchDeepByPatterns } from "utils/search";
import { sleep } from "utils/time";

import {
    renderActions,
    selectCameraType,
    selectClippingPlanes,
    selectGeneratedParametricData,
    selectStamp,
} from "../renderSlice";
import { CameraType, ObjectVisibility, Picker, StampKind } from "../types";
import { applyCameraDistanceToMeasureTolerance, getLocalRotationAroundNormal } from "../utils";

const selectionFeatures = [
    canvasContextMenuConfig.addFileToBasket.key,
    canvasContextMenuConfig.clip.key,
    canvasContextMenuConfig.hide.key,
    canvasContextMenuConfig.hideLayer.key,
];
const measureFeatures = [canvasContextMenuConfig.measure.key, canvasContextMenuConfig.laser.key];

let currentTab = 0;
export function CanvasContextMenuStamp() {
    const features = useAppSelector(selectCanvasContextMenuFeatures);
    const hasSelectionFeatures = features.some((feature) => (selectionFeatures as string[]).includes(feature));
    const hasMeasureFeatures = features.some((feature) => (measureFeatures as string[]).includes(feature));
    currentTab = hasSelectionFeatures && hasMeasureFeatures ? currentTab : hasMeasureFeatures ? 1 : 0;
    const [tab, setTab] = useState(currentTab);
    const stamp = useAppSelector(selectStamp);
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (stamp && stamp.kind === StampKind.CanvasContextMenu && stamp.data.object) {
            if (tab === 1) {
                dispatch(renderActions.setMainObject(undefined));
                dispatchHighlighted(highlightActions.remove([stamp.data.object]));
            } else {
                dispatch(renderActions.setMainObject(stamp.data.object));
                dispatchHighlighted(highlightActions.add([stamp.data.object]));
            }
        }
    }, [dispatch, stamp, tab, dispatchHighlighted]);

    return (
        <>
            <Box
                sx={{
                    pointerEvents: "auto",
                    minWidth: 270,
                }}
            >
                <Box sx={{ borderBottom: 1, borderColor: "divider", background: "#f9f9f9", mb: 1 }}>
                    <Tabs
                        value={tab}
                        onChange={(_evt, value) => {
                            currentTab = value;
                            setTab(value);
                        }}
                    >
                        <Tab label={"Selection"} disabled={!hasSelectionFeatures} />
                        <Tab label={"Measure"} disabled={!hasMeasureFeatures} />
                    </Tabs>
                </Box>
                <Box visibility={tab === 0 ? "visible" : "hidden"} display={tab === 0 ? "block" : "none"}>
                    <Selection />
                </Box>
                <Box visibility={tab === 1 ? "visible" : "hidden"} display={tab === 1 ? "block" : "none"}>
                    <Measure />
                </Box>
            </Box>
        </>
    );
}

function Selection() {
    const dispatch = useAppDispatch();
    const dispatchHidden = useDispatchHidden();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchSelectionBasket = useDispatchSelectionBasket();
    const {
        state: { db, view },
    } = useExplorerGlobals(true);
    const checkProjectPermission = useCheckProjectPermission();

    const features = useAppSelector(selectCanvasContextMenuFeatures);
    const clippingPlanes = useAppSelector(selectClippingPlanes).planes;
    const cameraType = useAppSelector(selectCameraType);
    const stamp = useAppSelector(selectStamp);
    const [properties, setProperties] = useState<{
        layer: [string, string] | undefined;
        file: [string, string] | undefined;
    }>();

    useEffect(() => {
        loadObjectData();

        async function loadObjectData() {
            if (stamp?.kind !== StampKind.CanvasContextMenu) {
                console.warn("CanvasContextMenuStamp rendered for the wrong stamp kind");
                dispatch(renderActions.setStamp(null));
                return;
            }

            const objectId = stamp.data.object;

            if (objectId && stamp.data.position) {
                const obj = await getObjectData({ db, id: objectId, view });
                const file = getFilePathFromObjectPath(obj?.path ?? "");
                const layer = obj?.properties.find(([key]) =>
                    ["ifcClass", "dwg/layer"].map((str) => str.toLowerCase()).includes(key.toLowerCase()),
                );
                setProperties({
                    layer,
                    file: file ? ["path", file] : undefined,
                });
            }
        }
    }, [stamp, db, view, cameraType, dispatch]);

    if (stamp?.kind !== StampKind.CanvasContextMenu) {
        return null;
    }

    const close = () => {
        dispatch(renderActions.setStamp(null));
    };

    const hide = () => {
        if (stamp.data.object === undefined) {
            return;
        }

        dispatch(renderActions.setMainObject(undefined));
        dispatchHighlighted(highlightActions.remove([stamp.data.object]));
        dispatchHidden(hiddenActions.add([stamp.data.object]));
        dispatchSelectionBasket(selectionBasketActions.remove([stamp.data.object]));
        close();
    };

    const hideLayer = async () => {
        if (!properties?.layer) {
            return;
        }
        const handle = performance.now();
        dispatch(renderActions.addLoadingHandle(handle));

        close();

        await searchDeepByPatterns({
            db,
            searchPatterns: [{ property: properties.layer[0], value: properties.layer[1], exact: true }],
            callback: (ids) => {
                dispatch(renderActions.setMainObject(undefined));
                dispatchHighlighted(highlightActions.remove(ids));
                dispatchSelectionBasket(selectionBasketActions.remove(ids));
                dispatchHidden(hiddenActions.add(ids));
            },
        });

        dispatch(renderActions.removeLoadingHandle(handle));
    };

    const addToBasket = async () => {
        if (!properties?.file) {
            return;
        }

        const handle = performance.now();
        dispatch(renderActions.addLoadingHandle(handle));

        close();

        await searchDeepByPatterns({
            db,
            searchPatterns: [{ property: properties.file[0], value: properties.file[1], exact: true }],
            callback: (ids) => {
                dispatchHighlighted(highlightActions.remove(ids));
                dispatchHidden(hiddenActions.remove(ids));
                dispatchSelectionBasket(selectionBasketActions.add(ids));
            },
        });

        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));
        dispatch(renderActions.removeLoadingHandle(handle));
    };

    const clip = async () => {
        const { position, normal, object } = stamp.data;
        if (!normal || !position) {
            return;
        }

        const w = vec3.dot(normal, position);
        let rotation = 0;
        if (object) {
            try {
                const rotationQuat = await getObjectMetadataRotation(view, db, object);
                if (rotationQuat) {
                    rotation = getLocalRotationAroundNormal(rotationQuat, normal);
                }
            } catch (ex) {
                console.warn("Error getting clip rotation", ex);
            }
        }
        const normalOffset = vec4.fromValues(normal[0], normal[1], normal[2], w);
        dispatch(
            clippingOutlineLaserActions.setLaserPlane({
                normalOffset,
                rotation: rotation,
            }),
        );
        dispatch(
            renderActions.addClippingPlane({
                normalOffset,
                baseW: w,
                rotation,
                anchorPos: position,
                showPlane: false,
            }),
        );

        close();
    };

    return (
        <>
            {stamp.data.object !== undefined && !properties && <LinearProgress sx={{ mt: -1 }} />}
            <Box>
                {features.includes(config.hide.key) && (
                    <MenuItem
                        onClick={hide}
                        disabled={stamp.data.object === undefined || !checkProjectPermission(config.hide.permission)}
                    >
                        <ListItemIcon>
                            <VisibilityOff fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{config.hide.name}</ListItemText>
                    </MenuItem>
                )}
                {features.includes(config.hideLayer.key) && (
                    <MenuItem
                        onClick={hideLayer}
                        disabled={!properties?.layer || !checkProjectPermission(config.hideLayer.permission)}
                    >
                        <ListItemIcon>
                            <LayersClear fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>
                            {properties?.layer
                                ? config.hideLayer.name.replace(
                                      "class / layer",
                                      (properties.layer ?? [""])[0].toLowerCase() === "ifcclass" ? "class" : "layer",
                                  )
                                : config.hideLayer.name}
                        </ListItemText>
                    </MenuItem>
                )}
                {features.includes(config.addFileToBasket.key) && (
                    <MenuItem
                        onClick={addToBasket}
                        disabled={!properties?.file || !checkProjectPermission(config.addFileToBasket.permission)}
                    >
                        <ListItemIcon>
                            <Layers fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{config.addFileToBasket.name}</ListItemText>
                    </MenuItem>
                )}

                {features.includes(config.clip.key) && (
                    <MenuItem
                        onClick={clip}
                        disabled={
                            !stamp.data.normal ||
                            !stamp.data.position ||
                            clippingPlanes.length > 5 ||
                            !checkProjectPermission(config.clip.permission)
                        }
                    >
                        <ListItemIcon>
                            <CropLandscape fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{config.clip.name}</ListItemText>
                    </MenuItem>
                )}
            </Box>
        </>
    );
}

type CenterLine = Awaited<ReturnType<NonNullable<View["measure"]>["core"]["pickCurveSegment"]>>;
async function getRoadCenterLine({
    db,
    view,
    id,
}: {
    db: ObjectDB;
    view: View;
    id: number;
}): Promise<CenterLine | undefined> {
    const obj = await getObjectData({ db, view, id });

    if (!obj) {
        return;
    }

    if (obj.properties.some(([key]) => key === "Novorender/Path" || key === "Novorender/PathId")) {
        return view.measure?.core.pickCurveSegment(obj.id);
    }

    const fileName = getFileNameFromPath(obj.path);
    const isIfc = fileName?.toLowerCase().endsWith(".ifc") ?? false;

    const signal = new AbortController().signal;
    let cl: HierarcicalObjectReference | undefined;

    if (isIfc) {
        // ifc
        // Currently we expect single center line under a single project
        const parts = obj.path.split("/");
        const fileIndex = parts.lastIndexOf(fileName!);

        if (fileIndex === -1 || fileIndex === parts.length - 1) {
            return;
        }

        const parentPath = parts.slice(0, fileIndex + 2).join("/");
        const iterator = db.search(
            {
                parentPath,
                searchPattern: [{ property: "Novorender/PathId", value: "" }],
            },
            signal,
        );
        cl = (await iterator.next()).value as HierarcicalObjectReference | undefined;
    } else {
        // landxml
        const parentPath = getParentPath(getParentPath(obj.path));
        const iterator = db.search({ parentPath, descentDepth: 0, full: true }, signal);
        const clProperty = (await iterator.next()).value?.properties.find(
            ([key]: [key: string]) => key.toLowerCase() === "centerline",
        );

        if (!clProperty) {
            return;
        }

        const clParentIterator = db.search(
            {
                descentDepth: 0,
                searchPattern: [{ property: "name", value: clProperty[1], exact: true }],
            },
            signal,
        );
        const clParent = (await clParentIterator.next()).value as HierarcicalObjectReference | undefined;

        if (!clParent) {
            return;
        }

        const clIterator = db.search(
            {
                parentPath: clParent.path,
                descentDepth: 1,
                searchPattern: [
                    { property: "Novorender/Path", value: "" },
                    { property: "Novorender/PathId", value: "" },
                ],
            },
            signal,
        );
        cl = (await clIterator.next()).value as HierarcicalObjectReference | undefined;
    }

    return cl && view.measure?.core.pickCurveSegment(cl.id);
}

function Measure() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const {
        state: { db, view },
    } = useExplorerGlobals(true);

    const features = useAppSelector(selectCanvasContextMenuFeatures);
    const cameraType = useAppSelector(selectCameraType);
    const stamp = useAppSelector(selectStamp);
    const [status, setStatus] = useState(AsyncStatus.Initial);
    const [measureEntity, setMeasureEntity] = useState<MeasureEntity>();
    const [laser, setLaser] = useState<{ laser: OutlineLaser; plane: Vec4 }>();
    const [pickPoint, setPickPoint] = useState<vec3 | undefined>();
    const [centerLine, setCenterLine] = useState<CenterLine>();
    const measurements = useAppSelector(selectMeasureEntities);
    const laserPlane = useAppSelector(selectOutlineLaserPlane);
    const laser3d = useAppSelector(selectOutlineLaser3d);
    const lockElevation = useAppSelector(selectLockPointLineElevation);
    const allowGeneratedParametric = useAppSelector(selectGeneratedParametricData);
    const measurePickSettings = useAppSelector(selectMeasurePickSettings);
    const checkProjectPermission = useCheckProjectPermission();

    const isCrossSection = cameraType === CameraType.Orthographic && view.renderState.camera.far < 1;

    useEffect(() => {
        loadObjectData();

        async function loadObjectData() {
            if (stamp?.kind !== StampKind.CanvasContextMenu) {
                console.warn("CanvasContextMenuStamp rendered for the wrong stamp kind");
                dispatch(renderActions.setStamp(null));
                return;
            }

            if (status !== AsyncStatus.Initial) {
                return;
            }

            const objectId = stamp.data.object;
            let pickPoint = stamp.data.position;
            if (objectId && stamp.data.position) {
                setStatus(AsyncStatus.Loading);

                const loadMeasureEntity = async () => {
                    if (!isCrossSection) {
                        const tolerance = applyCameraDistanceToMeasureTolerance(
                            stamp.data.position!,
                            view.renderState.camera.position,
                            measurePickSettings,
                        );
                        const ent = await view.measure?.core
                            .pickMeasureEntity(
                                objectId,
                                stamp.data.position!,
                                tolerance,
                                allowGeneratedParametric.enabled,
                            )
                            .then((res) => res.entity)
                            .catch(() => undefined);

                        const pickMeasurePoint = await view.measure?.core
                            .pickMeasureEntity(
                                objectId,
                                stamp.data.position!,
                                { point: 0.4 },
                                allowGeneratedParametric.enabled,
                            )
                            .then((res) => res.entity)
                            .catch(() => undefined);
                        if (pickMeasurePoint?.drawKind === "vertex") {
                            pickPoint = pickMeasurePoint.parameter;
                        }
                        setMeasureEntity(ent);
                        setPickPoint(pickPoint);
                    }
                };

                const loadCenterLine = async () => {
                    const centerLine = await getRoadCenterLine({ db, view, id: objectId });
                    setCenterLine(centerLine);
                };

                loadCenterLine();
                loadMeasureEntity();
            }

            const plane = view.renderState.clipping.planes[0]?.normalOffset;
            if (cameraType === CameraType.Orthographic) {
                const [pos] = view.convert.screenSpaceToWorldSpace([vec2.fromValues(stamp.mouseX, stamp.mouseY)]);
                if (pos && plane) {
                    const laser = await getOutlineLaser(pos, view, "clipping", laserPlane?.rotation ?? 0, [plane]);
                    setLaser(laser ? { laser, plane } : undefined);
                    const outlinePoint = view.selectOutlinePoint(pos, 0.2);
                    if (outlinePoint) {
                        pickPoint = outlinePoint;
                    }
                }
            } else if (plane && stamp.data.position) {
                const planeDir = vec3.fromValues(plane[0], plane[1], plane[2]);
                const rayDir = vec3.sub(vec3.create(), view.renderState.camera.position, stamp.data.position);
                vec3.normalize(rayDir, rayDir);
                const d = vec3.dot(planeDir, rayDir);
                if (d > 0) {
                    const t = (plane[3] - vec3.dot(planeDir, view.renderState.camera.position)) / d;
                    const pos = vec3.scaleAndAdd(vec3.create(), view.renderState.camera.position, rayDir, t);
                    const laser = await getOutlineLaser(pos, view, "clipping", laserPlane?.rotation ?? 0, [plane]);
                    const outlinePoint = view.selectOutlinePoint(pos, 0.2);
                    setLaser(laser ? { laser, plane } : undefined);
                    if (outlinePoint) {
                        pickPoint = outlinePoint;
                    }
                }
            } else if (stamp.data.position && stamp.data.normal) {
                const { normal, position } = stamp.data;
                const offsetPos = vec3.scaleAndAdd(vec3.create(), position, normal, 0.0001);
                const hiddenPlane = vec4.fromValues(normal[0], normal[1], normal[2], vec3.dot(offsetPos, normal));
                const hiddenPlanes: ReadonlyVec4[] = [hiddenPlane];
                if (laser3d) {
                    const perpendicular = getPerpendicular(normal);
                    hiddenPlanes.push(
                        vec4.fromValues(
                            perpendicular[0],
                            perpendicular[1],
                            perpendicular[2],
                            vec3.dot(perpendicular, offsetPos),
                        ),
                    );
                }
                view.modifyRenderState({
                    outlines: {
                        enabled: true,
                        hidden: true,
                        planes: hiddenPlanes,
                    },
                });
                await sleep(1000);

                const laser = await getOutlineLaser(
                    offsetPos,
                    view,
                    "outline",
                    0,
                    hiddenPlanes,
                    laser3d ? 1 : undefined,
                );
                view.modifyRenderState({ outlines: { enabled: false, hidden: false, planes: [] } });
                if (laser) {
                    setLaser({ laser, plane: hiddenPlane });
                }
            }

            setPickPoint(pickPoint);
            setStatus(AsyncStatus.Success);
        }
    }, [
        stamp,
        status,
        view,
        cameraType,
        dispatch,
        isCrossSection,
        db,
        laserPlane,
        laser3d,
        allowGeneratedParametric,
        measurePickSettings,
    ]);

    useEffect(() => {
        if (stamp) {
            setStatus(AsyncStatus.Initial);
        }
    }, [stamp]);

    if (stamp?.kind !== StampKind.CanvasContextMenu) {
        return null;
    }

    const close = () => {
        dispatch(renderActions.setStamp(null));
    };

    const measure = () => {
        if (!measureEntity) {
            return;
        }

        const currentMeasure = measurements.at(-1);
        if (currentMeasure && currentMeasure.length > 0) {
            dispatch(measureActions.newMeasurement());
        }

        dispatch(
            measureActions.selectEntity({
                entity: measureEntity,
                pin: true,
            }),
        );

        close();
    };

    const handleOutlinePoint = (hover: boolean) => {
        if (!pickPoint) {
            return;
        }

        if (measurements.at(-1)?.length === 2) {
            dispatch(measureActions.newMeasurement());
        }
        if (hover) {
            dispatch(
                measureActions.selectHoverObj({
                    ObjectId: -1,
                    drawKind: "vertex",
                    parameter: pickPoint,
                }),
            );
        } else {
            dispatch(
                measureActions.selectEntity({
                    entity: {
                        ObjectId: -1,
                        drawKind: "vertex",
                        parameter: pickPoint,
                        settings: { planeMeasure: view.renderState.clipping.planes[0]?.normalOffset },
                    },
                    pin: true,
                }),
            );
            close();
        }
    };

    const handleHoverOutlinePoint = () => {
        handleOutlinePoint(true);
    };
    const handleClickOutlinePoint = () => {
        handleOutlinePoint(false);
    };
    const removeHover = () => {
        dispatch(measureActions.selectHoverObj(undefined));
    };

    const startPointLine = () => {
        if (!stamp.data.position) {
            return;
        }
        dispatch(pointLineActions.newPointLine());
        if (!lockElevation && view.isTopDown()) {
            dispatch(pointLineActions.toggleLockElevation());
        }
        dispatch(renderActions.setPicker(Picker.PointLine));
        close();
    };

    const startArea = () => {
        if (!stamp.data.position) {
            return;
        }
        dispatch(areaActions.newArea());
        dispatch(renderActions.setPicker(Picker.Area));
        close();
    };

    const addLaser = async () => {
        if (!laser) {
            return;
        }
        dispatch(clippingOutlineLaserActions.addLaser(laser.laser));
        close();
    };

    const pickCenterLine = () => {
        if (!centerLine) {
            return;
        }

        dispatch(measureActions.setSelectedEntities([centerLine]));
        dispatch(measureActions.pin(0));
        close();
    };

    return (
        <>
            <Box>
                {features.includes(config.measure.key) && (
                    <MenuItem
                        onClick={measure}
                        disabled={
                            !measureEntity ||
                            measureEntity.drawKind === "vertex" ||
                            !checkProjectPermission(config.measure.permission)
                        }
                    >
                        <ListItemIcon>
                            <Straighten fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{config.measure.name}</ListItemText>
                    </MenuItem>
                )}
                {features.includes(config.laser.key) && (
                    <MenuItem
                        onClick={addLaser}
                        disabled={
                            !laser || status !== AsyncStatus.Success || !checkProjectPermission(config.laser.permission)
                        }
                    >
                        <ListItemIcon>
                            {status !== AsyncStatus.Success ? (
                                <CircularProgress size={24} />
                            ) : (
                                <Height fontSize="small" />
                            )}
                        </ListItemIcon>
                        <ListItemText>{config.laser.name}</ListItemText>
                    </MenuItem>
                )}
                {features.includes(config.area.key) && (
                    <MenuItem
                        onClick={startArea}
                        disabled={!stamp.data.position || !checkProjectPermission(config.area.permission)}
                    >
                        <ListItemIcon>
                            <Straighten fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{config.area.name}</ListItemText>
                    </MenuItem>
                )}
                {features.includes(config.pointLine.key) && (
                    <MenuItem
                        onClick={startPointLine}
                        disabled={!stamp.data.position || !checkProjectPermission(config.pointLine.permission)}
                    >
                        <ListItemIcon>
                            <Straighten fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{config.pointLine.name}</ListItemText>
                    </MenuItem>
                )}
                {features.includes(config.pickPoint.key) && (
                    <MenuItem
                        onClick={handleClickOutlinePoint}
                        disabled={!pickPoint || !checkProjectPermission(config.pickPoint.permission)}
                        onMouseEnter={handleHoverOutlinePoint}
                        onMouseLeave={removeHover}
                    >
                        <ListItemIcon>
                            <Straighten fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{config.pickPoint.name}</ListItemText>
                    </MenuItem>
                )}
            </Box>
            {centerLine && (
                <Box mt={2}>
                    <Box px={2} display={"flex"} alignItems={"center"}>
                        <Divider
                            sx={{
                                display: "flex",
                                flexGrow: 1,
                                borderBottomWidth: 2,
                                borderColor: (theme) => theme.palette.secondary.main,
                            }}
                        />
                        <Typography px={1} fontWeight={600}>
                            {t("road")}
                        </Typography>
                        <Divider
                            sx={{
                                display: "flex",
                                flexGrow: 1,
                                borderBottomWidth: 2,
                                borderColor: (theme) => theme.palette.secondary.main,
                            }}
                        />
                    </Box>
                    <MenuItem onClick={pickCenterLine}>
                        <ListItemIcon>
                            <RouteOutlined fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{t("pickCenterLine")}</ListItemText>
                    </MenuItem>
                </Box>
            )}
        </>
    );
}
