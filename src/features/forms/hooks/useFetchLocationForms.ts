import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { featuresConfig } from "config/features";
import { useSceneId } from "hooks/useSceneId";
import { selectWidgets } from "slices/explorer";
import { AsyncStatus } from "types/misc";

import { useLazyGetTemplatesQuery } from "../api";
import { formsActions, selectAlwaysShowMarkers } from "../slice";
import { TemplateType } from "../types";

/**
 * Used for initial location form loading.
 * Template and form loading is controlled by Forms widget.
 * When have alwaysShowMarkers=true - we need to load location forms before Forms widget is visible.
 * This hook will only load forms one time, after that Forms widget catches up.
 */
export function useFetchInitialLocationForms() {
    const projectId = useSceneId();
    const isFormWidgetOpen = useAppSelector((state) => selectWidgets(state).includes(featuresConfig.forms.key));
    const alwaysShowMarkers = useAppSelector(selectAlwaysShowMarkers);
    const dispatch = useAppDispatch();

    const status = useRef(AsyncStatus.Initial);

    const [getTemplates] = useLazyGetTemplatesQuery();

    useEffect(() => {
        if (isFormWidgetOpen) {
            // In this case Forms widget is responsible for loading
            status.current = AsyncStatus.Success;
        }
    }, [isFormWidgetOpen]);

    useEffect(() => {
        load();

        async function load() {
            if (status.current !== AsyncStatus.Initial || !alwaysShowMarkers || !projectId) {
                return;
            }

            status.current = AsyncStatus.Loading;

            try {
                const templates = await getTemplates({ projectId, type: TemplateType.Geo }, true).unwrap();
                const locationForms = templates
                    .filter((t) => !!t.forms?.length)
                    .flatMap((t) => Object.entries(t.forms!).map(([id, form]) => ({ ...form, id, templateId: t.id! })));

                dispatch(formsActions.addLocationForms(locationForms));
                status.current = AsyncStatus.Success;
            } catch (error) {
                console.error(error);
                status.current = AsyncStatus.Error;
            }
        }
    }, [dispatch, projectId, alwaysShowMarkers, getTemplates]);
}
