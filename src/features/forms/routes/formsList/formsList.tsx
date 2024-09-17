import { ArrowBack, Delete, FilterAlt } from "@mui/icons-material";
import { Box, Button, FormControlLabel, Typography, useTheme } from "@mui/material";
import { type FormEvent, type MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useParams } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation, Divider, IosSwitch, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
} from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useDeleteTemplateMutation, useGetTemplateQuery } from "features/forms/api";
import { FormFilterMenu } from "features/forms/formFilterMenu";
import { formsActions, selectCurrentFormsList, selectFormFilters } from "features/forms/slice";
import { type FormId, type FormObject, type FormRecord, type FormState, TemplateType } from "features/forms/types";
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

    const [deleteTemplate, { isLoading: isTemplateDeleting }] = useDeleteTemplateMutation();

    const [items, setItems] = useState<
        (FormObject & { formState: FormState })[] | (FormRecord & { id: number; formState: FormState })[]
    >(
        template?.type === TemplateType.Search
            ? template.objects!.map((object: FormObject) => ({
                  ...object,
                  id: -1,
                  formState: template.forms![object.guid].state,
              }))
            : template?.type === TemplateType.Location
              ? Object.entries(template?.forms ?? {}).map(([id, form]: [string, FormRecord]) => ({
                    ...form,
                    formState: form.state,
                    id: Number(id),
                }))
              : [],
    );
    const [loadingItems, setLoadingItems] = useState(false);
    const [filteredItems, setFilteredItems] = useState<
        (FormObject & { formState: FormState })[] | (FormRecord & { id: number; formState: FormState })[]
    >([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const abortSignal = abortController.current.signal;

    useEffect(() => {
        if (!template) {
            return;
        }

        if (template.type === TemplateType.Location) {
            setItems(
                Object.entries(template?.forms ?? {}).map(([id, form]: [string, FormRecord]) => ({
                    ...form,
                    formState: form.state,
                    id: Number(id),
                })) ?? [],
            );
            dispatch(
                formsActions.setTemplateLocationForms({
                    templateId: template.id!,
                    forms: Object.entries(template.forms || {}).map(([id, f]) => ({
                        ...f,
                        templateId: template.id!,
                        id: id!,
                    })),
                }),
            );
        } else if (template.type === TemplateType.Search) {
            setItems(
                template.objects!.map((object: FormObject) => ({
                    ...object,
                    id: -1,
                    formState: template.forms![object.guid].state,
                })) ?? [],
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
                    const id = map[(item as FormObject).guid];
                    return { ...item, id } as FormObject & { formState: FormState };
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
        (item: (FormObject & { formState: FormState }) | (FormRecord & { id: number; formState: FormState })) => {
            const name = ("name" in item ? item.name : "title" in item ? item.title : "") ?? "";
            const formState = item.formState;

            const activeStateFilters = Object.entries(formFilters)
                .filter(([_, value]) => value === true)
                .map(([filter]) => filter);

            const matches =
                activeStateFilters.includes(formState) &&
                (!formFilters.name || name.trim().toLowerCase().includes(formFilters.name.trim().toLowerCase()));

            return matches;
        },
        [formFilters],
    );

    useEffect(() => {
        if (template?.type !== TemplateType.Search) {
            dispatch(
                renderActions.setDefaultVisibility(
                    items.length > 0 ? ObjectVisibility.SemiTransparent : ObjectVisibility.Neutral,
                ),
            );
            return;
        }

        const forms = items.filter(filterItems);

        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));

        const newGroup = formFilters.new ? forms.filter((form) => form.formState === "new").map((form) => form.id) : [];
        const ongoingGroup = formFilters.ongoing
            ? forms.filter((form) => form.formState === "ongoing").map((form) => form.id)
            : [];
        const finishedGroup = formFilters.finished
            ? forms.filter((form) => form.formState === "finished").map((form) => form.id)
            : [];

        dispatchHighlightCollections(highlightCollectionsActions.setIds(HighlightCollection.FormsNew, newGroup));
        dispatchHighlightCollections(
            highlightCollectionsActions.setIds(HighlightCollection.FormsOngoing, ongoingGroup),
        );
        dispatchHighlightCollections(
            highlightCollectionsActions.setIds(HighlightCollection.FormsCompleted, finishedGroup),
        );
    }, [items, formFilters, dispatch, dispatchHighlightCollections, filterItems, template]);

    useEffect(() => {
        if (!items.length) {
            return;
        }
        setFilteredItems(items.filter(filterItems) as typeof items);
    }, [items, filterItems]);

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
            dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));
        } else {
            dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
            dispatch(renderActions.setPicker(Picker.FormLocation));
        }
    };

    const handleDelete = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            await deleteTemplate({ projectId: sceneId, templateId });
            if (template?.type === TemplateType.Location) {
                if (isPickingLocation) {
                    dispatch(renderActions.stopPicker(Picker.FormLocation));
                }
            }
            history.push("/");
        },
        [deleteTemplate, dispatch, history, isPickingLocation, sceneId, template, templateId],
    );

    const ListItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const item = filteredItems[index];
        return (
            <div style={style}>
                <FormsListItem key={"guid" in item ? item.guid : item.id} item={item} formId={templateId} />
            </div>
        );
    };

    return isDeleting ? (
        <Confirmation
            title={t("deleteAllFormsInTemplate", { title: template?.title })}
            confirmBtnText={t("delete")}
            onCancel={() => setIsDeleting(false)}
            component="form"
            onSubmit={handleDelete}
            loading={isTemplateDeleting}
        />
    ) : (
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
                                sx={{ ml: 1 }}
                            />
                        )}
                    </Box>
                    <Button
                        color="grey"
                        onClick={() => setIsDeleting(true)}
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
                {items.length === 0 && <Typography px={1}>{t("noForms")}</Typography>}
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
