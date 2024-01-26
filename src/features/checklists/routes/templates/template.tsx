import { ListItemButton, Skeleton, Typography } from "@mui/material";
import { useCallback, useMemo } from "react";
import { useHistory } from "react-router-dom";

import { useGetTemplateQuery } from "features/checklists/api";
import { useSceneId } from "hooks/useSceneId";

import { type TemplateId } from "../../types";

export function Template({ templateId }: { templateId: TemplateId }) {
    const history = useHistory();
    const sceneId = useSceneId();

    const { data: template, isLoading } = useGetTemplateQuery({
        projectId: sceneId,
        templateId,
    });

    const count = useMemo(() => {
        if (!template) {
            return "";
        }
        const finished = Object.values(template.forms || {}).filter((s) => s === "finished").length;
        const total = template!.objects?.length || 0;
        return `${finished} / ${total}`;
    }, [template]);

    const handleClick = useCallback(() => {
        if (!template) {
            return;
        }
        history.push(`/checklist/${template.id}`);
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
