import { Bookmark } from "@novorender/data-js-api";
import { OrthoControllerParams } from "@novorender/webgl-api";
import { quat, vec3 } from "gl-matrix";

import { useAppSelector } from "app/store";
import { useCustomGroups } from "contexts/customGroups";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useLazyHidden } from "contexts/hidden";
import { useLazyHighlighted } from "contexts/highlighted";
import { useLazyVisible } from "contexts/visible";
import {
    ObjectVisibility,
    selectDefaultVisibility,
    selectMainObject,
    selectMeasure,
    selectSelectionBasketMode,
} from "slices/renderSlice";

export function useCreateBookmark() {
    const measurement = useAppSelector(selectMeasure);
    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const mainObject = useAppSelector(selectMainObject);
    const selectionBasketMode = useAppSelector(selectSelectionBasketMode);

    const {
        state: { view },
    } = useExplorerGlobals(true);
    const { state: customGroups } = useCustomGroups();
    const highlighted = useLazyHighlighted();
    const hidden = useLazyHidden();
    const visible = useLazyVisible();

    const create = (img?: string): Omit<Bookmark, "name" | "description" | "img"> & { img?: string } => {
        const camera = view.camera;
        const { highlight: _highlight, ...clippingPlanes } = view.settings.clippingPlanes;
        const { ...clippingVolume } = view.settings.clippingVolume;
        const selectedOnly = defaultVisibility !== ObjectVisibility.Neutral;

        const selectionBasket: Bookmark["selectionBasket"] = visible.current.idArr.length
            ? {
                  ids: visible.current.idArr,
                  mode: selectionBasketMode,
              }
            : undefined;

        const objectGroups = customGroups
            .map(({ id, selected, hidden, ids }) => ({
                id,
                selected,
                hidden,
                ids: id ? undefined : ids,
            }))
            .concat({
                id: "",
                selected: true,
                hidden: false,
                ids: highlighted.current.idArr.concat(
                    mainObject !== undefined && !highlighted.current.ids[mainObject] ? [mainObject] : []
                ),
            })
            .concat({
                id: "",
                selected: false,
                hidden: true,
                ids: hidden.current.idArr,
            });

        if (camera.kind === "pinhole") {
            const { kind, position, rotation, fieldOfView, near, far } = camera;

            return {
                img,
                objectGroups,
                selectedOnly,
                clippingVolume,
                selectionBasket,
                clippingPlanes: {
                    ...clippingPlanes,
                    bounds: {
                        min: Array.from(clippingPlanes.bounds.min) as [number, number, number],
                        max: Array.from(clippingPlanes.bounds.max) as [number, number, number],
                    },
                },
                camera: {
                    kind,
                    position: vec3.copy(vec3.create(), position),
                    rotation: quat.copy(quat.create(), rotation),
                    fieldOfView,
                    near,
                    far,
                },
                measurement: measurement.points.length > 0 ? measurement.points : undefined,
            };
        } else {
            const ortho = camera.controller.params as OrthoControllerParams;
            return {
                img,
                ortho,
                objectGroups,
                selectedOnly,
                selectionBasket,
                clippingPlanes,
                clippingVolume,
                measurement: measurement.points.length > 0 ? measurement.points : undefined,
            };
        }
    };

    return create;
}
