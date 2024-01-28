import { ArrowBack, FilterAlt } from "@mui/icons-material";
import { Box, Button, List, Typography, useTheme } from "@mui/material";
import { ObjectId } from "@novorender/api/types/data";
import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
} from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { FilterMenu } from "features/forms/filterMenu";
import { mapGuidsToIds } from "features/forms/utils";
import { ObjectVisibility, renderActions } from "features/render";
import { useAbortController } from "hooks/useAbortController";
import { useSceneId } from "hooks/useSceneId";

import { useGetTemplateQuery } from "../../api";
import { formsActions, selectCurrentFormsList, selectFilters } from "../../slice";
import { type FormId, type FormObject, type FormState } from "../../types";
import { FormsListItem } from "./formsListItem";

const FILTER_MENU_ID = "form-filter-menu";

export function FormsList() {
    const { templateId } = useParams<{ templateId: FormId }>();
    const {
        state: { db },
    } = useExplorerGlobals(true);
    const [abortController] = useAbortController();
    const sceneId = useSceneId();
    const theme = useTheme();
    const history = useHistory();
    const filters = useAppSelector(selectFilters);
    const currentFormsList = useAppSelector(selectCurrentFormsList);
    const willUnmount = useRef(false);
    const [filterMenuAnchor, setFilterMenuAnchor] = useState<HTMLElement | null>(null);
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();

    const dispatchHighlightCollections = useDispatchHighlightCollections();

    const { data: template, isLoading: loadingTemplate } = useGetTemplateQuery({
        projectId: sceneId,
        templateId,
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
                !history.location.pathname.startsWith("/instance") &&
                !history.location.pathname.startsWith("/object")
            ) {
                dispatchHighlighted(highlightActions.setIds([]));
                dispatchHighlightCollections(highlightCollectionsActions.clearAll());
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
                dispatchHighlighted(highlightActions.resetColor());
                dispatch(formsActions.setCurrentFormsList(null));
            }
        },
        [history.location.pathname, dispatch, dispatchHighlighted, dispatchHighlightCollections]
    );

    useEffect(() => {
        if (!currentFormsList) {
            dispatch(formsActions.resetFilters());
            dispatch(formsActions.setCurrentFormsList(templateId));
        }
    }, [dispatch, templateId, currentFormsList]);

    const filterItems = useCallback(
        (item: FormObject & { formState: FormState }) => {
            const name = item.name ?? "";
            const formState = item.formState;

            const activeStateFilters = Object.entries(filters)
                .filter(([_, value]) => value === true)
                .map(([filter]) => filter);

            const matches =
                activeStateFilters.includes(formState) &&
                (!filters.name || name.trim().toLowerCase().includes(filters.name.trim().toLowerCase()));

            return matches;
        },
        [filters]
    );

    useEffect(() => {
        const forms = items.filter(filterItems);

        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));

        const newGroup = filters.new ? forms.filter((form) => form.formState === "new").map((form) => form.id) : [];
        const ongoingGroup = filters.ongoing
            ? forms.filter((form) => form.formState === "ongoing").map((form) => form.id)
            : [];
        const finishedGroup = filters.finished
            ? forms.filter((form) => form.formState === "finished").map((form) => form.id)
            : [];

        dispatchHighlightCollections(highlightCollectionsActions.setIds(HighlightCollection.FormsNew, newGroup));
        dispatchHighlightCollections(
            highlightCollectionsActions.setIds(HighlightCollection.FormsOngoing, ongoingGroup)
        );
        dispatchHighlightCollections(
            highlightCollectionsActions.setIds(HighlightCollection.FormsCompleted, finishedGroup)
        );
    }, [items, filters, dispatch, dispatchHighlightCollections, filterItems]);

    const handleBackClick = () => {
        history.push("/");
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
                        <Button color="grey" onClick={handleBackClick}>
                            <ArrowBack sx={{ mr: 1 }} />
                            Back
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
            {(loadingTemplate || loadingItems) && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox pt={2} pb={3}>
                <Typography px={1} fontWeight={600} mb={1}>
                    {template?.title ?? ""}
                </Typography>
                <List dense disablePadding>
                    {items?.filter(filterItems).map((item) => (
                        <FormsListItem key={item.guid} item={item} formId={templateId} />
                    ))}
                </List>
            </ScrollBox>
            <FilterMenu
                anchorEl={filterMenuAnchor}
                open={Boolean(filterMenuAnchor)}
                onClose={closeFilters}
                id={FILTER_MENU_ID}
            />
        </>
    );
}
