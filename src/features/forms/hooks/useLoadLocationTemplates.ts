import { useEffect, useRef } from "react";

import { useAppDispatch } from "app/redux-store-interactions";
import { useAbortController } from "hooks/useAbortController";
import { useSceneId } from "hooks/useSceneId";

import { useLazyGetTemplateQuery, useListTemplatesQuery } from "../api";
import { formsActions } from "../slice";
import { TemplateType } from "../types";

export function useLoadLocationTemplates() {
    const [getTemplate] = useLazyGetTemplateQuery();
    const projectId = useSceneId();
    const dispatch = useAppDispatch();
    const [abortController] = useAbortController();
    const loaded = useRef(new Set<string>());

    const { data: templateIds = [], isLoading: loadingTemplateIds } = useListTemplatesQuery({
        projectId,
    });

    useEffect(() => {
        loaded.current = new Set();
    }, [projectId]);

    useEffect(() => {
        loadTemplates();

        async function loadTemplates() {
            if (loadingTemplateIds || templateIds.length === 0) {
                return;
            }

            const queries: { abort: () => void }[] = [];
            const abortQueries = () => {
                for (const query of queries) {
                    query.abort();
                }
            };
            abortController.current.signal.addEventListener("abort", abortQueries);

            await Promise.all(
                templateIds.map(async (templateId) => {
                    const promise = getTemplate({ projectId, templateId: templateId }, true);
                    queries.push(promise);

                    const template = await promise.unwrap();
                    const forms = Object.entries(template.forms || {}).map(([id, f]) => ({
                        ...f,
                        templateId,
                        id: id!,
                    }));

                    dispatch(formsActions.templateLoaded(template));
                    if (template.type === TemplateType.Location) {
                        dispatch(formsActions.addLocationForms(forms));
                    }
                    loaded.current.add(templateId);

                    return forms;
                })
            );

            abortController.current.signal.removeEventListener("abort", abortQueries);
        }
    }, [templateIds, projectId, getTemplate, dispatch, abortController, loadingTemplateIds]);
}
