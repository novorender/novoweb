import { ArrowBack } from "@mui/icons-material";
import { Box, Button, List, Typography, useTheme } from "@mui/material";
import { ObjectId } from "@novorender/api/types/data";
import { useEffect, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch } from "app/store";
import { Divider, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
} from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { mapGuidsToIds } from "features/checklists/utils";
import { ObjectVisibility, renderActions } from "features/render";
import { useAbortController } from "hooks/useAbortController";
import { useSceneId } from "hooks/useSceneId";

import { useGetTemplateQuery } from "../../api";
import { type FormId, type FormObject, type FormState } from "../../types";
import { ChecklistItem } from "./checklistItem";

export function Checklist() {
    const { formId } = useParams<{ formId: FormId }>();
    const {
        state: { db },
    } = useExplorerGlobals(true);
    const [abortController] = useAbortController();
    const sceneId = useSceneId();
    const theme = useTheme();
    const history = useHistory();
    const willUnmount = useRef(false);
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();

    const dispatchHighlightCollections = useDispatchHighlightCollections();

    const { data: template, isLoading: loadingTemplate } = useGetTemplateQuery({
        projectId: sceneId,
        templateId: formId,
    });

    const [items, setItems] = useState<(FormObject & { id: ObjectId; formState: FormState })[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    const abortSignal = abortController.current.signal;

    useEffect(() => {
        if (!template) {
            return;
        }
        const fetchItems = async () => {
            setLoadingItems(true);
            const map = await mapGuidsToIds({
                db,
                abortSignal,
                guids: Object.keys(template.forms as Record<string, FormState>),
            });

            const items =
                template?.objects!.reduce(
                    (items: (FormObject & { id: ObjectId; formState: FormState })[], object: FormObject) => {
                        const formState = template.forms![object.guid] as FormState;
                        const id = map[object.guid];
                        items.push({ ...object, id, formState });
                        return items;
                    },
                    []
                ) ?? [];

            setItems(items);
            setLoadingItems(false);
        };

        fetchItems();
    }, [db, abortSignal, template]);

    useEffect(() => {
        return () => {
            willUnmount.current = true;
        };
    }, []);

    useEffect(
        () => () => {
            if (
                willUnmount.current &&
                !history.location.pathname.startsWith("/form") &&
                !history.location.pathname.startsWith("/object")
            ) {
                dispatchHighlighted(highlightActions.setIds([]));
                dispatchHighlightCollections(highlightCollectionsActions.clearAll());
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
                dispatchHighlighted(highlightActions.resetColor());
            }
        },
        [history.location.pathname, dispatch, dispatchHighlighted, dispatchHighlightCollections]
    );

    useEffect(() => {
        dispatchHighlighted(highlightActions.setIds([]));
        dispatchHighlightCollections(highlightCollectionsActions.clearAll());

        if (items.length === 0) {
            return;
        }

        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));

        const newGroup = items.filter((item) => item.formState === "new").map((item) => item.id) as number[];
        const ongoingGroup = items.filter((item) => item.formState === "ongoing").map((item) => item.id) as number[];
        const finishedGroup = items.filter((item) => item.formState === "finished").map((item) => item.id) as number[];

        dispatchHighlightCollections(highlightCollectionsActions.setIds(HighlightCollection.ChecklistsNew, newGroup));
        dispatchHighlightCollections(
            highlightCollectionsActions.setIds(HighlightCollection.ChecklistOngoing, ongoingGroup)
        );
        dispatchHighlightCollections(
            highlightCollectionsActions.setIds(HighlightCollection.ChecklistCompleted, finishedGroup)
        );
    }, [items, dispatch, dispatchHighlighted, dispatchHighlightCollections]);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex">
                        <Button color="grey" onClick={history.goBack}>
                            <ArrowBack sx={{ mr: 1 }} />
                            Back
                        </Button>
                    </Box>
                </>
            </Box>
            {(loadingTemplate || loadingItems) && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox pt={2} pb={3}>
                <Typography px={1} fontWeight={600} mb={1}>
                    {template?.title}
                </Typography>
                <List dense disablePadding>
                    {items?.map((item) => (
                        <ChecklistItem key={item.guid} item={item} formId={formId} />
                    ))}
                </List>
            </ScrollBox>
        </>
    );
}
