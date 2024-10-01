import { useCallback, useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { featuresConfig } from "config/features";
import { useSceneId } from "hooks/useSceneId";
import { selectWidgets } from "slices/explorer";
import { AsyncStatus } from "types/misc";

import { useLazyGetTemplatesQuery } from "../api";
import { formsActions, selectAlwaysShowMarkers } from "../slice";
import { TemplateType } from "../types";

/**
 * Used for loading location templates and populating location forms from templates' indexes.
 * Full individual template and form loading is controlled by Forms widget.
 * When alwaysShowMarkers=true - we need to load location forms before Forms widget is visible.
 * This hook will load location forms when needed (when Forms widget is opened or alwaysShowMarkers=true).
 */
export function useFetchLocationForms() {
    const projectId = useSceneId();
    const isFormWidgetOpen = useAppSelector((state) => selectWidgets(state).includes(featuresConfig.forms.key));
    const alwaysShowMarkers = useAppSelector(selectAlwaysShowMarkers);
    const dispatch = useAppDispatch();

    const status = useRef(AsyncStatus.Initial);

    const [getTemplates] = useLazyGetTemplatesQuery();

    const load = useCallback(async () => {
        if (status.current !== AsyncStatus.Initial || !projectId || (!isFormWidgetOpen && !alwaysShowMarkers)) {
            return;
        }

        status.current = AsyncStatus.Loading;

        try {
            const templates = await getTemplates({ projectId, type: TemplateType.Geo }, true).unwrap();
            const locationForms = templates
                .filter((t) => t.forms)
                .flatMap((t) => {
                    dispatch(formsActions.templateLoaded(t));
                    return Object.entries(t.forms!).map(([id, form]) => ({ ...form, id, templateId: t.id! }));
                });

            dispatch(formsActions.addLocationForms(locationForms));
            status.current = AsyncStatus.Success;
        } catch (error) {
            console.error("Failed to load templates:", error);
            status.current = AsyncStatus.Error;
        }
    }, [dispatch, projectId, alwaysShowMarkers, getTemplates, isFormWidgetOpen]);

    useEffect(() => {
        load();
    }, [load]);
}
