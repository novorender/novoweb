import { vec2 } from "gl-matrix";
import { MouseEvent } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncStatus } from "types/misc";

import {
    arcgisActions,
    FeatureServerState,
    selectArcgisFeatureServers,
    selectArcgisSelectedFeature,
    SelectedFeatureId,
} from "../arcgisSlice";
import { findHitFeatureIndex, isSuitableCameraForArcgis } from "../utils";

export function useArcgisCanvasClickHandler() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const prevSelectedFeature = useAppSelector(selectArcgisSelectedFeature);
    const dispatch = useAppDispatch();

    // Returns true if something was picked, so the caller could stop downstream handling in this case
    const handleCanvasPick = (evt: MouseEvent) => {
        if (
            !view ||
            featureServers.status !== AsyncStatus.Success ||
            featureServers.data.length === 0 ||
            !isSuitableCameraForArcgis(view.renderState.camera)
        ) {
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

        const selectedFeature = findHitFeature(featureServers.data, pos2d, sensitivity);
        if (selectedFeature) {
            let payload: SelectedFeatureId | undefined = selectedFeature;
            if (
                prevSelectedFeature &&
                prevSelectedFeature.featureServerId === selectedFeature.featureServerId &&
                prevSelectedFeature.layerId === selectedFeature.layerId &&
                prevSelectedFeature.featureIndex === selectedFeature.featureIndex
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

function findHitFeature(
    featureServers: FeatureServerState[],
    pos: vec2,
    sensitivity: number
): SelectedFeatureId | undefined {
    for (const featureServer of featureServers) {
        for (const layer of featureServer.layers) {
            if (!layer.checked || layer.details.status !== AsyncStatus.Success) {
                continue;
            }

            const featureIndex = findHitFeatureIndex(
                pos,
                sensitivity,
                layer.details.data.features,
                layer.details.data.featuresAabb
            );

            if (featureIndex !== -1) {
                return {
                    featureServerId: featureServer.config.id,
                    layerId: layer.meta.id,
                    featureIndex,
                };
            }
        }
    }
}
