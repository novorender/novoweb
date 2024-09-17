import { Place, Search } from "@mui/icons-material";
import { ListItemButton, Typography } from "@mui/material";
import { useCallback, useMemo } from "react";
import { useHistory } from "react-router-dom";

import { type MinimalTemplate, TemplateType } from "features/forms/types";

export function Template({ template }: { template: MinimalTemplate }) {
    const history = useHistory();

    const templateIcon = useMemo(
        () =>
            template?.type === TemplateType.Search || template?.type === TemplateType.Object ? (
                <Search />
            ) : template?.type === TemplateType.Location || template?.type === TemplateType.Geo ? (
                <Place />
            ) : null,
        [template],
    );

    const count = useMemo(() => {
        if (!template) {
            return "";
        }
        const { finished, total } = template.forms;
        return total === 0 ? "" : `${finished} / ${total}`;
    }, [template]);

    const handleClick = useCallback(() => {
        if (!template) {
            return;
        }
        history.push(`/forms/${template.id}`);
    }, [history, template]);

    return (
        <ListItemButton
            key={template.id}
            sx={{ justifyContent: "space-between", height: "48px" }}
            onClick={handleClick}
        >
            {templateIcon}
            <Typography
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
                flex={1}
                mx={1}
                title={template.title}
            >
                {template.title}
            </Typography>
            <Typography>{count}</Typography>
        </ListItemButton>
    );
}
