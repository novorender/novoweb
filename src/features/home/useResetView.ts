import { SceneData } from "@novorender/data-js-api";

import { api, dataApi } from "app";
import {
    initAdvancedSettings,
    initClippingBox,
    initClippingPlanes,
    initDeviations,
    initHidden,
    initHighlighted,
    initSubtrees,
} from "features/render/utils";
import { imagesActions } from "features/images";
import { useSceneId } from "hooks/useSceneId";

import { useAppDispatch, useAppSelector } from "app/store";
import {
    CameraType,
    renderActions,
    selectAdvancedSettings,
    selectHomeCameraPosition,
} from "features/render/renderSlice";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useDispatchHighlighted } from "contexts/highlighted";
import { useDispatchHidden } from "contexts/hidden";
import { objectGroupsActions, useDispatchObjectGroups, useLazyObjectGroups } from "contexts/objectGroups";
import { useDispatchSelectionBasket, selectionBasketActions } from "contexts/selectionBasket";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";
import { measureActions } from "features/measure";
import { areaActions } from "features/area";
import { pointLineActions } from "features/pointLine";
import { manholeActions } from "features/manhole";
import { xsiteManageActions } from "features/xsiteManage";

export function useResetView() {
    const id = useSceneId();
    const {
        state: { view_OLD: view, scene_OLD: scene },
    } = useExplorerGlobals(true);

    const homeCameraPos = useAppSelector(selectHomeCameraPosition);
    const { triangleLimit } = useAppSelector(selectAdvancedSettings);
    const objectGroups = useLazyObjectGroups();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const dispatchSelectionBasket = useDispatchSelectionBasket();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const dispatchHidden = useDispatchHidden();
    const dispatch = useAppDispatch();

    const reset = async ({ resetCamera = true }: { resetCamera?: boolean } = {}) => {
        const {
            settings,
            customProperties,
            objectGroups: savedObjectGroups = [],
            camera = { kind: "flight" },
        } = (await dataApi.loadScene(id)) as SceneData;

        dispatch(renderActions.resetState());
        dispatch(measureActions.clear());
        dispatch(areaActions.setPoints([]));
        dispatch(pointLineActions.setPoints([]));
        dispatch(manholeActions.initFromBookmark(undefined));
        dispatch(xsiteManageActions.clearLogPoints(undefined));

        if (settings) {
            const { display: _display, quality: _quality, environment: _env, light: _light, ...toApply } = settings;

            if (toApply.terrain.asBackground === undefined) {
                toApply.terrain.asBackground = false;
            }

            view.applySettings(toApply);
            initClippingBox(toApply.clippingPlanes);
            initClippingPlanes(toApply.clippingVolume ?? { enabled: false, mode: "union", planes: [] });
            initDeviations(toApply.points.deviation ?? { mode: "off", colors: [] });
        }

        if (resetCamera) {
            if (camera.kind === "ortho") {
                dispatch(renderActions.setCamera({ type: CameraType.Orthographic, params: camera }));
            } else {
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Flight,
                        goTo: homeCameraPos,
                    })
                );
            }
        }

        dispatchSelectionBasket(selectionBasketActions.set([]));
        dispatchHighlightCollections(highlightCollectionsActions.clearAll());
        initHidden(dispatchHidden);
        initHighlighted(dispatchHighlighted, customProperties.highlights?.primary?.color);
        initAdvancedSettings(view, { ...customProperties, triangleLimit }, api);
        dispatch(imagesActions.setActiveImage(undefined));
        initSubtrees(view, scene);

        dispatchObjectGroups(
            objectGroupsActions.set(
                [
                    ...objectGroups.current.map((group) => {
                        const originalGrpSettings = savedObjectGroups.find((grp) => group.id === grp.id);

                        group.selected = originalGrpSettings?.selected ?? false;
                        group.hidden = originalGrpSettings?.hidden ?? false;

                        return group;
                    }),
                ].sort(
                    (a, b) =>
                        savedObjectGroups.findIndex((grp) => grp.id === a.id) -
                        savedObjectGroups.findIndex((grp) => grp.id === b.id)
                )
            )
        );
    };

    return reset;
}
