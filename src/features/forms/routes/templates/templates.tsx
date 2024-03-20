import { AddCircle, FilterAlt } from "@mui/icons-material";
import { Box, Button, List, Typography, useTheme } from "@mui/material";
import { type MouseEvent, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch } from "app/store";
import { Divider, LinearProgress, ScrollBox } from "components";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { TemplateFilterMenu } from "features/forms/templateFilterMenu";
import { ObjectVisibility, renderActions } from "features/render";
import { useSceneId } from "hooks/useSceneId";

import { useListTemplatesQuery } from "../../api";
import { Template } from "./template";

const FILTER_MENU_ID = "templates-filter-menu";

export function Templates() {
    const theme = useTheme();
    const history = useHistory();
    const sceneId = useSceneId();
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();

    const [filterMenuAnchor, setFilterMenuAnchor] = useState<HTMLElement | null>(null);

    useEffect(() => {
        dispatchHighlightCollections(highlightCollectionsActions.clearAll());
        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
        dispatchHighlighted(highlightActions.resetColor());
    }, [dispatch, dispatchHighlighted, dispatchHighlightCollections]);

    const { data: templateIds = [], isLoading } = useListTemplatesQuery({
        projectId: sceneId,
    });

    const handleAddFormClick = () => {
        history.push("/create");
    };

    const openFilters = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setFilterMenuAnchor(e.currentTarget);
    };

    const closeFilters = () => {
        setFilterMenuAnchor(null);
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex">
                        <Button color="grey" onClick={handleAddFormClick}>
                            <AddCircle sx={{ mr: 1 }} />
                            Add form
                        </Button>
                        <Button
                            color="grey"
                            onClick={openFilters}
                            aria-haspopup="true"
                            aria-controls={FILTER_MENU_ID}
                            aria-expanded={Boolean(filterMenuAnchor)}
                        >
                            <FilterAlt sx={{ mr: 1 }} />
                            Filters
                        </Button>
                    </Box>
                </>
            </Box>
            {isLoading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : (
                <ScrollBox py={2}>
                    {templateIds.length ? (
                        <List dense disablePadding>
                            {templateIds.map((templateId) => (
                                <Template templateId={templateId} key={templateId} />
                            ))}
                        </List>
                    ) : (
                        <Typography px={1}>No forms.</Typography>
                    )}
                </ScrollBox>
            )}
            <TemplateFilterMenu
                anchorEl={filterMenuAnchor}
                open={Boolean(filterMenuAnchor)}
                onClose={closeFilters}
                id={FILTER_MENU_ID}
            />
        </>
    );
}
