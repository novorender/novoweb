import { ListItemButton, Skeleton, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch } from "app/store";
import { useGetTemplateQuery } from "features/forms/api";
import { formsActions } from "features/forms/slice";
import { useSceneId } from "hooks/useSceneId";

import { SearchTemplate, type TemplateId, TemplateType } from "../../types";

export function Template({ templateId }: { templateId: TemplateId }) {
    const history = useHistory();
    const sceneId = useSceneId();
    const dispatch = useAppDispatch();

    const { data: template, isLoading } = useGetTemplateQuery({
        projectId: sceneId,
        templateId,
    });

    useEffect(() => {
        if (template) {
            dispatch(formsActions.templateLoaded(template));
        }
    }, [dispatch, template]);

    const count = useMemo(() => {
        if (!template || template.type === TemplateType.Location) {
            return "";
        }
        const finished = Object.values(template.forms || {}).filter((s) => s === "finished").length;
        const total = (template as SearchTemplate)!.objects.length || 0;
        return `${finished} / ${total}`;
    }, [template]);

    const handleClick = useCallback(() => {
        if (!template) {
            return;
        }
        history.push(`/forms/${template.id}`);
    }, [history, template]);

    return isLoading ? (
        <Skeleton variant="rectangular" height="2rem" />
    ) : (
        <ListItemButton key={template!.id} sx={{ justifyContent: "space-between" }} onClick={handleClick}>
            <Typography mr={2}>{template!.title}</Typography>
            <Typography>{count}</Typography>
        </ListItemButton>
    );
}
