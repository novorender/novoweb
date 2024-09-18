import { AddCircle, Delete, FilterAlt } from "@mui/icons-material";
import { Box, Button, Divider, LinearProgress, Typography, useTheme } from "@mui/material";
import { type FormEvent, type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation, ScrollBox } from "components";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { TemplateFilterMenu } from "features/forms/templateFilterMenu";
import { MinimalTemplate, TemplateType } from "features/forms/types";
import { ObjectVisibility, renderActions } from "features/render";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { useSceneId } from "hooks/useSceneId";
import { selectUser } from "slices/authSlice";

import { useDeleteAllFormsMutation, useGetMinimalTemplatesQuery } from "../../api";
import { formsActions, selectTemplatesFilters } from "../../slice";
import { Template } from "./template";

const FILTER_MENU_ID = "templates-filter-menu";

export function Templates() {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const sceneId = useSceneId();
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const user = useAppSelector(selectUser);
    const templatesFilters = useAppSelector(selectTemplatesFilters);
    const checkPermission = useCheckProjectPermission();
    const canManage = checkPermission(Permission.FormsManage);
    const canDelete = checkPermission(Permission.FormsDelete);

    const isInternal = useMemo(
        () =>
            user?.user?.endsWith("@novorender.com") ||
            user?.user?.endsWith("@novotech.no") ||
            user?.organization === "novodev",
        [user],
    );

    const [deleteAllForms, { isLoading: isAllFormsDeleting }] = useDeleteAllFormsMutation();

    const [filterMenuAnchor, setFilterMenuAnchor] = useState<HTMLElement | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [filteredTemplates, setFilteredTemplates] = useState<MinimalTemplate[]>([]);

    useEffect(() => {
        dispatchHighlightCollections(highlightCollectionsActions.clearAll());
        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
        dispatchHighlighted(highlightActions.resetColor());
    }, [dispatch, dispatchHighlighted, dispatchHighlightCollections]);

    const {
        data: templates = [],
        isLoading,
        error,
    } = useGetMinimalTemplatesQuery({
        projectId: sceneId,
    });

    useEffect(() => {
        if (isLoading || !templates.length) {
            return;
        }

        setFilteredTemplates(
            templates.filter(
                (tmpl) =>
                    (tmpl.title.toLocaleLowerCase().includes(templatesFilters.name.toLocaleLowerCase()) &&
                        templatesFilters.geo &&
                        (tmpl.type === TemplateType.Geo || tmpl.type === TemplateType.Location)) ||
                    (templatesFilters.object &&
                        (tmpl.type === TemplateType.Object || tmpl.type === TemplateType.Search)),
            ),
        );
    }, [isLoading, templates, templatesFilters, templatesFilters.name]);

    // Clean up location forms after template deletion
    useEffect(() => {
        if (isLoading) {
            return;
        }
        const ids = error ? [] : templates.map((t) => t.id);
        dispatch(formsActions.removeLocationFormsNotInTemplates(ids));
    }, [dispatch, templates, error, isLoading]);

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

    const handleDelete = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            await deleteAllForms({
                projectId: sceneId,
            });
            dispatch(formsActions.setLocationForms([]));
            setIsDeleting(false);
        },
        [deleteAllForms, dispatch, sceneId],
    );

    const TemplateItem = ({ index, style }: { index: number; style: React.CSSProperties }) => (
        <div style={style}>
            <Template template={filteredTemplates[index]} />
        </div>
    );

    return isDeleting ? (
        <Confirmation
            title={t("deleteAllFormsConfirmation")}
            confirmBtnText={t("delete")}
            onCancel={() => setIsDeleting(false)}
            component="form"
            onSubmit={handleDelete}
            loading={isAllFormsDeleting}
            headerShadow={false}
        />
    ) : (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box m={1} display="flex" justifyContent="space-between">
                    <Button color="grey" onClick={handleAddFormClick} disabled={!canManage || !user}>
                        <AddCircle sx={{ mr: 1 }} />
                        {t("addForm")}
                    </Button>
                    <Button
                        color="grey"
                        onClick={openFilters}
                        aria-haspopup="true"
                        aria-controls={FILTER_MENU_ID}
                        aria-expanded={Boolean(filterMenuAnchor)}
                        disabled={isLoading || !templates.length || !!error}
                    >
                        <FilterAlt sx={{ mr: 1 }} />
                        {t("filters")}
                    </Button>

                    {isInternal && (
                        <Button
                            color="grey"
                            onClick={() => setIsDeleting(true)}
                            disabled={!canDelete || !user || isLoading || !templates.length || !!error}
                        >
                            <Delete fontSize="small" sx={{ mr: 1 }} />
                            {t("deleteAllForms")}
                        </Button>
                    )}
                </Box>
            </Box>
            {isLoading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : (
                <ScrollBox py={2} height="100%">
                    {!error && templates.length ? (
                        <AutoSizer disableWidth>
                            {({ height }) => (
                                <List
                                    height={height}
                                    itemCount={filteredTemplates.length}
                                    itemSize={48}
                                    width="100%"
                                    overscanCount={3}
                                >
                                    {TemplateItem}
                                </List>
                            )}
                        </AutoSizer>
                    ) : (
                        <Typography px={1}>{t(!user ? "loginToViewForms" : "noForms")}</Typography>
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
