import { ListItemButton, Skeleton, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { useGetTemplateQuery } from "features/forms/api";
import { formsActions, selectTemplatesFilters } from "features/forms/slice";
import { type TemplateId, TemplateType } from "features/forms/types";
import { useSceneId } from "hooks/useSceneId";

export function Template({ templateId }: { templateId: TemplateId }) {
    const history = useHistory();
    const sceneId = useSceneId();
    const dispatch = useAppDispatch();
    const templatesFilters = useAppSelector(selectTemplatesFilters);
    const { data: template, isLoading } = useGetTemplateQuery({
        projectId: sceneId,
        templateId,
    });

    const isFilteredOut = useMemo(
        () =>
            !isLoading &&
            (!template!.title?.toLocaleLowerCase().includes(templatesFilters.name.toLocaleLowerCase()) ||
                (!templatesFilters.location && template!.type === TemplateType.Location) ||
                (!templatesFilters.search && template!.type === TemplateType.Search)),
        [isLoading, template, templatesFilters]
    );

    useEffect(() => {
        if (template) {
            dispatch(formsActions.templateLoaded(template));
        }
    }, [dispatch, template]);

    const count = useMemo(() => {
        if (!template) {
            return "";
        }
        const finished = Object.values(template.forms || {}).filter((s) => s.state === "finished").length;

        if (template.type === TemplateType.Search) {
            return `${finished} / ${template.objects?.length}`;
        }

        if (template.type === TemplateType.Location) {
            const total = Object.keys(template.forms || {}).length;
            return total === 0 ? "" : `${finished} / ${total}`;
        }
    }, [template]);

    const handleClick = useCallback(() => {
        if (!template) {
            return;
        }
        history.push(`/forms/${template.id}`);
    }, [history, template]);

    if (isFilteredOut) {
        return null;
    }

    return isLoading ? (
        <Skeleton variant="rectangular" height="2rem" />
    ) : (
        <ListItemButton key={template!.id} sx={{ justifyContent: "space-between" }} onClick={handleClick}>
            <Typography mr={2}>{template!.title}</Typography>
            <Typography>{count}</Typography>
        </ListItemButton>
    );
}
