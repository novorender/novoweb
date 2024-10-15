import { ArrowBack, Delete, FilterAlt } from "@mui/icons-material";
import { Box, Button, FormControlLabel, Typography, useTheme } from "@mui/material";
import { memo, type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useParams } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, IosSwitch, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
} from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useGetTemplateQuery } from "features/forms/api";
import { FormFilterMenu } from "features/forms/formFilterMenu";
import { DELETE_TEMPLATE_ROUTE } from "features/forms/routes/constants";
import { formsActions, selectCurrentFormsList, selectFormFilters } from "features/forms/slice";
import { type FormId, type FormObject, type FormRecord, TemplateType } from "features/forms/types";
import { mapGuidsToIds } from "features/forms/utils";
import { ObjectVisibility, Picker, renderActions, selectPicker } from "features/render";
import { useAbortController } from "hooks/useAbortController";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { useSceneId } from "hooks/useSceneId";

import { FormsListItem } from "./formsListItem";

const FILTER_MENU_ID = "form-filter-menu";

export function FormsList() {
    const { templateId } = useParams<{ templateId: FormId }>();
    const {
        state: { db },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const [abortController] = useAbortController();
    const sceneId = useSceneId();
    const theme = useTheme();
    const history = useHistory();
    const formFilters = useAppSelector(selectFormFilters);
    const currentFormsList = useAppSelector(selectCurrentFormsList);
    const willUnmount = useRef(false);
    const [filterMenuAnchor, setFilterMenuAnchor] = useState<HTMLElement | null>(null);
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const isPickingLocation = useAppSelector(selectPicker) === Picker.FormLocation;
    const checkPermission = useCheckProjectPermission();
    const canDelete = checkPermission(Permission.FormsDelete);
    const canAdd = checkPermission(Permission.FormsManage);

    const dispatchHighlightCollections = useDispatchHighlightCollections();

    const { data: template, isLoading: loadingTemplate } = useGetTemplateQuery({
        projectId: sceneId,
        templateId,
    });

    const [items, setItems] = useState<(FormRecord & { id?: number; guid?: string; name?: string })[]>(
        Object.entries(template?.forms ?? {}).map(([id, form]: [string, FormRecord]) => ({
            ...form,
            id: template?.type === TemplateType.Location ? Number(id) : undefined,
            ...(template?.type === TemplateType.Search
                ? {
                      guid: id,
                      name: template?.objects.find((object: FormObject) => object.guid === id)?.name,
                  }
                : {}),
        })),
    );
    const [loadingItems, setLoadingItems] = useState(false);

    const abortSignal = abortController.current.signal;

    useEffect(() => {
        if (!template) {
            return;
        }

        setItems(
            Object.entries(template?.forms ?? {}).map(([id, form]: [string, FormRecord]) => ({
                ...form,
                id: template?.type === TemplateType.Location ? Number(id) : undefined,
                ...(template?.type === TemplateType.Search
                    ? {
                          guid: id,
                          name: template?.objects.find((object: FormObject) => object.guid === id)?.name,
                      }
                    : {}),
            })),
        );

        if (template.type === TemplateType.Location) {
            dispatch(
                formsActions.setTemplateLocationForms({
                    templateId: template.id!,
                    forms: Object.entries(template.forms || {}).map(([id, f]) => ({
                        ...f,
                        templateId: template.id!,
                        id,
                    })),
                }),
            );
        }
    }, [dispatch, template]);

    useEffect(() => {
        if (!template || template.type !== TemplateType.Search) {
            return;
        }

        const fetchIds = async () => {
            setLoadingItems(true);

            const map = await mapGuidsToIds({
                db,
                abortSignal,
                guids: Object.keys(template.forms as Record<string, FormRecord>),
            });

            setItems((prevItems) =>
                prevItems.map((item) => {
                    if (!item.guid) {
                        return item;
                    }
                    const id = map[item.guid];
                    return { ...item, id };
                }),
            );
            setLoadingItems(false);
        };

        fetchIds();
    }, [db, abortSignal, template]);

    useEffect(() => {
        willUnmount.current = false;
        return () => {
            willUnmount.current = true;
        };
    }, []);

    useEffect(
        () => () => {
            if (
                willUnmount.current &&
                !history.location.pathname.startsWith("/search-instance") &&
                !history.location.pathname.startsWith("/location-instance") &&
                !history.location.pathname.startsWith("/object")
            ) {
                if (template?.type === TemplateType.Search) {
                    dispatchHighlighted(highlightActions.setIds([]));
                    dispatchHighlightCollections(highlightCollectionsActions.clearAll());
                    dispatchHighlighted(highlightActions.resetColor());
                }
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
                dispatch(formsActions.setCurrentFormsList(null));
            }
        },
        [history.location.pathname, dispatch, dispatchHighlighted, dispatchHighlightCollections, template],
    );

    useEffect(() => {
        if (currentFormsList !== templateId) {
            dispatch(formsActions.resetFormFilters());
        }
    }, [dispatch, templateId, currentFormsList]);

    useEffect(() => {
        dispatch(formsActions.setCurrentFormsList(templateId));
    }, [dispatch, templateId]);

    const filterItems = useCallback(
        (item: FormRecord & { id?: number; guid?: string; name?: string }) => {
            const name = item.title ?? item.name ?? "";

            const activeStateFilters = Object.entries(formFilters)
                .filter(([_, value]) => value === true)
                .map(([filter]) => filter);

            const matches =
                activeStateFilters.includes(item.state) &&
                (!formFilters.name || name.trim().toLowerCase().includes(formFilters.name.trim().toLowerCase()));

            return matches;
        },
        [formFilters],
    );

    const filteredItems = useMemo(() => items.filter(filterItems), [items, filterItems]);

    useEffect(() => {
        dispatch(
            renderActions.setDefaultVisibility(
                items.length > 0 ? ObjectVisibility.SemiTransparent : ObjectVisibility.Neutral,
            ),
        );
    }, [dispatch, items]);

    useEffect(() => {
        if (template?.type !== TemplateType.Search) {
            return;
        }

        const forms = items.filter(filterItems).filter((form) => Number.isInteger(form.id));

        const newGroup = formFilters.new ? forms.filter((form) => form.state === "new").map((form) => form.id!) : [];
        const ongoingGroup = formFilters.ongoing
            ? forms.filter((form) => form.state === "ongoing").map((form) => form.id!)
            : [];
        const finishedGroup = formFilters.finished
            ? forms.filter((form) => form.state === "finished").map((form) => form.id!)
            : [];

        dispatchHighlightCollections(highlightCollectionsActions.setIds(HighlightCollection.FormsNew, newGroup));
        dispatchHighlightCollections(
            highlightCollectionsActions.setIds(HighlightCollection.FormsOngoing, ongoingGroup),
        );
        dispatchHighlightCollections(
            highlightCollectionsActions.setIds(HighlightCollection.FormsCompleted, finishedGroup),
        );
    }, [items, formFilters, dispatch, filterItems, template, dispatchHighlightCollections]);

    const handleBackClick = () => {
        if (isPickingLocation) {
            dispatch(renderActions.stopPicker(Picker.FormLocation));
        }
        history.push("/");
    };

    const openFilters = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setFilterMenuAnchor(e.currentTarget);
    };

    const closeFilters = () => {
        setFilterMenuAnchor(null);
    };

    const addLocationForm = () => {
        if (isPickingLocation) {
            dispatch(renderActions.stopPicker(Picker.FormLocation));
            dispatch(
                renderActions.setDefaultVisibility(
                    items.length > 0 ? ObjectVisibility.SemiTransparent : ObjectVisibility.Neutral,
                ),
            );
        } else {
            dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
            dispatch(renderActions.setPicker(Picker.FormLocation));
        }
    };

    const handleDeleteClick = useCallback(() => {
        history.push({
            pathname: DELETE_TEMPLATE_ROUTE,
            state: {
                title: template?.title,
                templateId,
                templateType: template?.type,
            },
        });
    }, [history, template?.title, templateId, template?.type]);

    const ListItem = memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
        const item = filteredItems[index];
        return (
            <div style={style}>
                <FormsListItem key={"guid" in item ? item.guid : item.id} item={item} formId={templateId} />
            </div>
        );
    });

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box m={1} display="flex" justifyContent="space-between">
                    <Box display="flex">
                        <Button color="grey" onClick={handleBackClick}>
                            <ArrowBack sx={{ mr: 1 }} />
                            {t("back")}
                        </Button>
                        <Button
                            color="grey"
                            onClick={openFilters}
                            aria-haspopup="true"
                            aria-controls={FILTER_MENU_ID}
                            aria-expanded={Boolean(filterMenuAnchor)}
                        >
                            <FilterAlt sx={{ mr: 1 }} />
                            {t("filters")}
                        </Button>
                        {template?.type === TemplateType.Location && (
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={isPickingLocation}
                                        onChange={addLocationForm}
                                        disabled={!canAdd}
                                    />
                                }
                                label={<Box fontSize={14}>{t("add")}</Box>}
                                sx={{ m: 0 }}
                            />
                        )}
                    </Box>
                    <Button
                        color="grey"
                        onClick={handleDeleteClick}
                        disabled={!canDelete || loadingTemplate || loadingItems || !items.length}
                    >
                        <Delete fontSize="small" sx={{ mr: 1 }} />
                        {t("deleteAll")}
                    </Button>
                </Box>
            </Box>
            {(loadingTemplate || loadingItems) && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <Typography py={2} px={1} fontWeight={600}>
                {template?.title ?? ""}
            </Typography>
            <ScrollBox pb={2} flex={1}>
                {items.length === 0 ? (
                    <Typography px={1}>{t("noForms")}</Typography>
                ) : (
                    <AutoSizer disableWidth>
                        {({ height }) => (
                            <List
                                height={height}
                                itemCount={filteredItems.length}
                                itemSize={48}
                                width="100%"
                                overscanCount={5}
                            >
                                {ListItem}
                            </List>
                        )}
                    </AutoSizer>
                )}
            </ScrollBox>
            <FormFilterMenu
                anchorEl={filterMenuAnchor}
                open={Boolean(filterMenuAnchor)}
                onClose={closeFilters}
                id={FILTER_MENU_ID}
            />
        </>
    );
}
