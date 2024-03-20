import { vec2 } from "gl-matrix";
import { MouseEvent } from "react";

import { useAppDispatch, useAppSelector } from "app";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncStatus } from "types/misc";

import { arcgisActions, selectArcgisFeatureServers, selectArcgisSelectedFeature } from "../arcgisSlice";
import { FeatureServer, SelectedFeatureId } from "../types";
import { areSelectedFeatureIdsEqual, findHitFeatures } from "../utils";
import { useIsCameraSetCorrectly } from "./useIsCameraSetCorrectly";

export function useArcgisCanvasClickHandler() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const prevSelectedFeature = useAppSelector(selectArcgisSelectedFeature);
    const dispatch = useAppDispatch();
    const isCameraSetCorrectly = useIsCameraSetCorrectly();

    if (!isCameraSetCorrectly) {
        return;
    }

    // Returns true if something was picked, so the caller could stop downstream handling in this case
    const handleCanvasPick = (evt: MouseEvent) => {
        if (!view || featureServers.status !== AsyncStatus.Success || featureServers.data.length === 0) {
            return false;
        }

        const isTouch = evt.nativeEvent instanceof PointerEvent && evt.nativeEvent.pointerType === "touch";
        const pxSensitivity = isTouch ? 16 : 8;

        const position = view.worldPositionFromPixelPosition(evt.nativeEvent.offsetX, evt.nativeEvent.offsetY);
        const sensPos = view.worldPositionFromPixelPosition(
            evt.nativeEvent.offsetX - pxSensitivity,
            evt.nativeEvent.offsetY
        );
        if (!position || !sensPos) {
            return false;
        }

        const pos2d = vec2.fromValues(position[0], position[1]);

        const sensitivity = pos2d[0] - sensPos[0];

        const selectedFeature = doFindHitFeature(featureServers.data, pos2d, sensitivity, prevSelectedFeature);
        if (selectedFeature) {
            let payload: SelectedFeatureId | undefined = selectedFeature;
            if (
                prevSelectedFeature &&
                prevSelectedFeature.featureServerId === selectedFeature.featureServerId &&
                prevSelectedFeature.layerId === selectedFeature.layerId &&
                prevSelectedFeature.featureId === selectedFeature.featureId
            ) {
                // Unselect already selected
                payload = undefined;
            }

            dispatch(arcgisActions.setSelectedFeature(payload));
            return true;
        }

        return false;
    };

    return handleCanvasPick;
}

function doFindHitFeature(
    featureServers: FeatureServer[],
    pos: vec2,
    sensitivity: number,
    currentlySelected: SelectedFeatureId | undefined
): SelectedFeatureId | undefined {
    const hits: SelectedFeatureId[] = [];

    for (const featureServer of featureServers) {
        for (const layer of featureServer.layers) {
            if (
                !layer.checked ||
                layer.features.status !== AsyncStatus.Success ||
                layer.definition.status !== AsyncStatus.Success
            ) {
                continue;
            }

            for (const feature of findHitFeatures(pos, sensitivity, layer.features.data)) {
                hits.push({
                    featureServerId: featureServer.id,
                    layerId: layer.id,
                    featureId: feature.attributes[layer.definition.data.objectIdField] as number,
                });
            }
        }
    }

    if (hits.length === 0) {
        return;
    }

    if (hits.length === 1) {
        return hits[0];
    }

    if (currentlySelected) {
        const currentHitIndex = hits.findIndex((h) => areSelectedFeatureIdsEqual(h, currentlySelected));
        if (currentHitIndex !== -1) {
            return hits[(currentHitIndex + 1) % hits.length];
        }
    }

    return hits[0];
}
