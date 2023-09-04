import { CropLandscape, Layers, LayersClear, Straighten, VisibilityOff } from "@mui/icons-material";
import { Box, ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import { MeasureEntity } from "@novorender/api";
import { vec3, vec4 } from "gl-matrix";
import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { LinearProgress } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { hiddenActions, useDispatchHidden } from "contexts/hidden";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { selectionBasketActions, useDispatchSelectionBasket } from "contexts/selectionBasket";
import { measureActions } from "features/measure";
import { ObjectVisibility, StampKind, renderActions, selectClippingPlanes, selectStamp } from "features/render";
import { selectCanvasContextMenuFeatures } from "slices/explorerSlice";
import { getFilePathFromObjectPath } from "utils/objectData";
import { getObjectData, searchDeepByPatterns } from "utils/search";

export const canvasContextMenuConfig = {
    hide: {
        key: "hide",
        name: "Hide",
    },
    hideLayer: {
        key: "hideLayer",
        name: "Hide class / layer",
    },
    addFileToBasket: {
        key: "addFileToBasket",
        name: "Add file to selection basket",
    },
    measure: {
        key: "measure",
        name: "Measure",
    },
    clip: {
        key: "clip",
        name: "Add clipping plane",
    },
} as const;

const config = canvasContextMenuConfig;
export const canvasContextMenuFeatures = Object.values(config);
export const defaultCanvasContextMenuFeatures = [
    config.hide.key,
    config.hideLayer.key,
    config.addFileToBasket.key,
    config.measure.key,
    config.clip.key,
];
export type CanvasContextMenuFeatureKey = keyof typeof config;

export function CanvasContextMenuStamp() {
    const dispatch = useAppDispatch();
    const dispatchHidden = useDispatchHidden();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchSelectionBasket = useDispatchSelectionBasket();
    const {
        state: { db, measureView },
    } = useExplorerGlobals(true);

    const features = useAppSelector(selectCanvasContextMenuFeatures);
    const clippingPlanes = useAppSelector(selectClippingPlanes).planes;
    const stamp = useAppSelector(selectStamp);
    const [measureEntity, setMeasureEntity] = useState<MeasureEntity>();
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

            const [obj, ent] = await Promise.all([
                getObjectData({ db, id: objectId }),
                measureView.core
                    .pickMeasureEntity(objectId, stamp.data.position)
                    .then((res) => (["face"].includes(res.entity.drawKind) ? res.entity : undefined))
                    .catch(() => undefined),
            ]);

            setMeasureEntity(ent);

            const file = getFilePathFromObjectPath(obj?.path ?? "");
            const layer = obj?.properties.find(([key]) =>
                ["ifcClass", "dwg/layer"].map((str) => str.toLowerCase()).includes(key.toLowerCase())
            );
            setProperties({
                layer,
                file: file ? ["path", file] : undefined,
            });
        }
    }, [stamp, db, measureView, dispatch]);

    if (stamp?.kind !== StampKind.CanvasContextMenu) {
        return null;
    }

    const close = () => {
        dispatch(renderActions.setStamp(null));
    };

    const hide = () => {
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

    const measure = () => {
        if (!measureEntity) {
            return;
        }

        dispatch(
            measureActions.selectEntity({
                entity: measureEntity,
            })
        );

        close();
    };

    const clip = () => {
        const { position, normal } = stamp.data;
        if (!normal) {
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
            {!properties && <LinearProgress sx={{ mt: -1 }} />}
            <Box
                sx={{
                    pointerEvents: "auto",
                }}
            >
                {features.includes(config.hide.key) && (
                    <MenuItem onClick={hide}>
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
                {features.includes(config.measure.key) && (
                    <MenuItem onClick={measure} disabled={!measureEntity}>
                        <ListItemIcon>
                            <Straighten fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{config.measure.name}</ListItemText>
                    </MenuItem>
                )}
                {features.includes(config.clip.key) && (
                    <MenuItem onClick={clip} disabled={!stamp.data.normal || clippingPlanes.length > 5}>
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
