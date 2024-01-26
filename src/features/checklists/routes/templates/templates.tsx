import { AddCircle } from "@mui/icons-material";
import { Box, Button, List, Typography, useTheme } from "@mui/material";
import { useEffect } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch } from "app/store";
import { Divider, LinearProgress, ScrollBox } from "components";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { ObjectVisibility, renderActions } from "features/render";
import { useSceneId } from "hooks/useSceneId";

import { useListTemplatesQuery } from "../../api";
import { Template } from "./template";

export function Templates() {
    const theme = useTheme();
    const history = useHistory();
    const sceneId = useSceneId();
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();

    useEffect(() => {
        dispatchHighlighted(highlightActions.setIds([]));
        dispatch(renderActions.setMainObject(undefined));
        dispatchHighlightCollections(highlightCollectionsActions.clearAll());
        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
        dispatchHighlighted(highlightActions.resetColor());
    }, [dispatch, dispatchHighlighted, dispatchHighlightCollections]);

    const { data: templateIds = [], isLoading } = useListTemplatesQuery({
        projectId: sceneId,
    });

    const handleAddChecklistClick = () => {
        history.push("/create");
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex">
                        <Button color="grey" onClick={handleAddChecklistClick}>
                            <AddCircle sx={{ mr: 1 }} />
                            Add checklist
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
                        <Typography p={1}>No checklists</Typography>
                    )}
                </ScrollBox>
            )}
        </>
    );
}
