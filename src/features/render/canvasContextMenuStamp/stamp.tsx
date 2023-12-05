import {
    CropLandscape,
    Height,
    Layers,
    LayersClear,
    RouteOutlined,
    Straighten,
    VisibilityOff,
} from "@mui/icons-material";
import { Box, ListItemIcon, ListItemText, MenuItem, Tab, Tabs, Typography } from "@mui/material";
import { MeasureEntity, View } from "@novorender/api";
import { ObjectDB } from "@novorender/data-js-api";
import { HierarcicalObjectReference } from "@novorender/webgl-api";
import { vec3, vec4 } from "gl-matrix";
import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, LinearProgress } from "components";
import { canvasContextMenuConfig, canvasContextMenuConfig as config } from "config/canvasContextMenu";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { hiddenActions, useDispatchHidden } from "contexts/hidden";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { selectionBasketActions, useDispatchSelectionBasket } from "contexts/selectionBasket";
import { areaActions } from "features/area";
import { measureActions, selectMeasureEntities } from "features/measure";
import { clippingOutlineLaserActions, getOutlineLaser, OutlineLaser } from "features/outlineLaser";
import { pointLineActions } from "features/pointLine";
import {
    CameraType,
    ObjectVisibility,
    Picker,
    renderActions,
    selectCameraType,
    selectClippingPlanes,
    selectStamp,
    StampKind,
} from "features/render";
import { selectCanvasContextMenuFeatures } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";
import { getFilePathFromObjectPath, getParentPath } from "utils/objectData";
import { getObjectData, searchDeepByPatterns } from "utils/search";

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
    const hasSelectionFeatures = features.some((feature) => selectionFeatures.includes(feature as any));
    const hasMeasureFeatures = features.some((feature) => measureFeatures.includes(feature as any));
    currentTab = hasSelectionFeatures && hasMeasureFeatures ? currentTab : hasMeasureFeatures ? 1 : 0;
    const [tab, setTab] = useState(currentTab);

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

export function Selection() {
    const dispatch = useAppDispatch();
    const dispatchHidden = useDispatchHidden();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchSelectionBasket = useDispatchSelectionBasket();
    const {
        state: { db, view },
    } = useExplorerGlobals(true);

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
                    ["ifcClass", "dwg/layer"].map((str) => str.toLowerCase()).includes(key.toLowerCase())
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

    const clip = () => {
        const { position, normal } = stamp.data;
        if (!normal || !position) {
            return;
        }

        const w = vec3.dot(normal, position);
        dispatch(
            renderActions.addClippingPlane({
                normalOffset: vec4.fromValues(normal[0], normal[1], normal[2], w),
                baseW: w,
            })
        );

        close();
    };

    return (
        <>
            {stamp.data.object !== undefined && !properties && <LinearProgress sx={{ mt: -1 }} />}
            <Box>
                {features.includes(config.hide.key) && (
                    <MenuItem onClick={hide} disabled={stamp.data.object === undefined}>
                        <ListItemIcon>
                            <VisibilityOff fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{config.hide.name}</ListItemText>
                    </MenuItem>
                )}
                {features.includes(config.hideLayer.key) && (
                    <MenuItem onClick={hideLayer} disabled={!properties?.layer}>
                        <ListItemIcon>
                            <LayersClear fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>
                            {properties?.layer
                                ? config.hideLayer.name.replace(
                                      "class / layer",
                                      (properties.layer ?? [""])[0].toLowerCase() === "ifcclass" ? "class" : "layer"
                                  )
                                : config.hideLayer.name}
                        </ListItemText>
                    </MenuItem>
                )}
                {features.includes(config.addFileToBasket.key) && (
                    <MenuItem onClick={addToBasket} disabled={!properties?.file}>
                        <ListItemIcon>
                            <Layers fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{config.addFileToBasket.name}</ListItemText>
                    </MenuItem>
                )}

                {features.includes(config.clip.key) && (
                    <MenuItem
                        onClick={clip}
                        disabled={!stamp.data.normal || !stamp.data.position || clippingPlanes.length > 5}
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
async function getRoadCenterLine({ db, view, id }: { db: ObjectDB; view: View; id: number }): Promise<CenterLine> {
    const obj = await getObjectData({ db, view, id });

    if (!obj) {
        return;
    }

    if (obj.properties.find(([key]) => key === "Novorender/Path")) {
        return view.measure?.core.pickCurveSegment(obj.id);
    }

    const signal = new AbortController().signal;
    const iterator = db.search({ parentPath: getParentPath(getParentPath(obj.path)), descentDepth: 0 }, signal);

    const res = (await iterator.next()).value as HierarcicalObjectReference | undefined;
    const clProperty = (await res?.loadMetaData())?.properties.find(([key]) => key.toLowerCase() === "centerline");

    if (!clProperty) {
        return;
    }

    const clParentIterator = db.search(
        {
            searchPattern: [{ property: "name", value: clProperty[1] }],
        },
        signal
    );
    const clParent = (await clParentIterator.next()).value as HierarcicalObjectReference | undefined;

    if (!clParent) {
        return;
    }

    const clIterator = db.search(
        {
            searchPattern: [
                { property: "path", value: clParent.path },
                { property: "Novorender/Path", value: "" },
            ],
        },
        signal
    );
    const cl = (await clIterator.next()).value as HierarcicalObjectReference | undefined;

    if (!cl) {
        return;
    }

    return view.measure?.core.pickCurveSegment(cl.id);
}

export function Measure() {
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
    const [outlinePoint, setOutlinePoint] = useState<vec3 | undefined>();
    const [centerLine, setCenterLine] = useState<CenterLine>();
    const measurements = useAppSelector(selectMeasureEntities);

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
                setStatus(AsyncStatus.Loading);
                const ent = await view.measure?.core
                    .pickMeasureEntity(objectId, stamp.data.position)
                    // .then((res) => (["face"].includes(res.entity.drawKind) ? res.entity : undefined))
                    .then((res) => res.entity)
                    .catch(() => undefined);

                setMeasureEntity(ent);

                setCenterLine(await getRoadCenterLine({ db, view, id: objectId }));
            }

            const plane = view.renderState.clipping.planes[0]?.normalOffset;
            if (cameraType === CameraType.Orthographic) {
                const pos = view.worldPositionFromPixelPosition(stamp.mouseX, stamp.mouseY);
                if (pos && plane) {
                    const laser = await getOutlineLaser(pos, view, cameraType, plane);
                    setLaser(laser ? { laser, plane } : undefined);
                    setOutlinePoint(view.selectOutlinePoint(pos, 0.2));
                }
            } else if (plane && stamp.data.position) {
                const planeDir = vec3.fromValues(plane[0], plane[1], plane[2]);
                const rayDir = vec3.sub(vec3.create(), view.renderState.camera.position, stamp.data.position);
                vec3.normalize(rayDir, rayDir);
                const d = vec3.dot(planeDir, rayDir);
                if (d > 0) {
                    const t = (plane[3] - vec3.dot(planeDir, view.renderState.camera.position)) / d;
                    const pos = vec3.scaleAndAdd(vec3.create(), view.renderState.camera.position, rayDir, t);
                    const laser = await getOutlineLaser(pos, view, cameraType, plane);
                    const outlinePoint = view.selectOutlinePoint(pos, 0.2);
                    setOutlinePoint(outlinePoint);
                    setLaser(laser ? { laser, plane } : undefined);
                }
            }

            setStatus(AsyncStatus.Success);
        }
    }, [stamp, db, view, cameraType, dispatch]);

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

        if (measurements.at(-1)?.length === 1) {
            dispatch(measureActions.newMeasurement());
        }

        dispatch(
            measureActions.selectEntity({
                entity: measureEntity,
                pin: true,
            })
        );

        close();
    };

    const selectOutlinePoint = () => {
        if (!outlinePoint) {
            return;
        }

        if (measurements.at(-1)?.length === 2) {
            dispatch(measureActions.newMeasurement());
        }
        dispatch(
            measureActions.selectEntity({
                entity: {
                    ObjectId: -1,
                    drawKind: "vertex",
                    parameter: outlinePoint,
                },
                pin: true,
            })
        );

        close();
    };

    const startPointLine = () => {
        if (!stamp.data.position) {
            return;
        }
        dispatch(pointLineActions.newPointLine());
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

        dispatch(clippingOutlineLaserActions.setLaserPlane(laser.plane));
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
            {[AsyncStatus.Initial, AsyncStatus.Loading].includes(status) && <LinearProgress sx={{ mt: -1 }} />}
            <Box>
                {features.includes(config.measure.key) && (
                    <MenuItem onClick={measure} disabled={!measureEntity}>
                        <ListItemIcon>
                            <Straighten fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{config.measure.name}</ListItemText>
                    </MenuItem>
                )}
                {features.includes(config.laser.key) && (
                    <MenuItem onClick={addLaser} disabled={!laser}>
                        <ListItemIcon>
                            <Height fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{config.laser.name}</ListItemText>
                    </MenuItem>
                )}
                {features.includes(config.area.key) && (
                    <MenuItem onClick={startArea} disabled={!stamp.data.position}>
                        <ListItemIcon>
                            <Straighten fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{config.area.name}</ListItemText>
                    </MenuItem>
                )}
                {features.includes(config.pointLine.key) && (
                    <MenuItem onClick={startPointLine} disabled={!stamp.data.position}>
                        <ListItemIcon>
                            <Straighten fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{config.pointLine.name}</ListItemText>
                    </MenuItem>
                )}
                {features.includes(config.outlinePoint.key) && (
                    <MenuItem onClick={selectOutlinePoint} disabled={!outlinePoint}>
                        <ListItemIcon>
                            <Straighten fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{config.outlinePoint.name}</ListItemText>
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
                            Road
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
                        <ListItemText>Pick center line</ListItemText>
                    </MenuItem>
                </Box>
            )}
        </>
    );
}
