import { AddCircle, Delete, FilterAlt } from "@mui/icons-material";
import { Box, Button, List, Typography, useTheme } from "@mui/material";
import { type FormEvent, type MouseEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation, Divider, LinearProgress, ScrollBox } from "components";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { TemplateFilterMenu } from "features/forms/templateFilterMenu";
import { ObjectVisibility, renderActions } from "features/render";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { useSceneId } from "hooks/useSceneId";
import { selectUser } from "slices/authSlice";
import { selectHasAdminCapabilities } from "slices/explorer";

import { useDeleteAllFormsMutation, useListTemplatesQuery } from "../../api";
import { formsActions } from "../../slice";
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
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const checkPermission = useCheckProjectPermission();
    const canManage = checkPermission(Permission.FormsManage) ?? isAdmin;
    const canDelete = checkPermission(Permission.FormsDelete) ?? isAdmin;

    const [deleteAllForms, { isLoading: isAllFormsDeleting }] = useDeleteAllFormsMutation();

    const [filterMenuAnchor, setFilterMenuAnchor] = useState<HTMLElement | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        dispatchHighlightCollections(highlightCollectionsActions.clearAll());
        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
        dispatchHighlighted(highlightActions.resetColor());
    }, [dispatch, dispatchHighlighted, dispatchHighlightCollections]);

    const {
        data: templateIds = [],
        isLoading,
        error,
    } = useListTemplatesQuery({
        projectId: sceneId,
    });

    // Clean up location forms after template deletion
    useEffect(() => {
        const ids = error ? [] : templateIds;
        dispatch(formsActions.removeLocationFormsNotInTemplates(ids));
    }, [dispatch, templateIds, error]);

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

    return isDeleting ? (
        <Confirmation
            title="Are you sure you want to delete all the forms in the project?"
            confirmBtnText="Delete"
            onCancel={() => setIsDeleting(false)}
            component="form"
            onSubmit={handleDelete}
            loading={isAllFormsDeleting}
        />
    ) : (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <Box display="flex">
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
                                disabled={isLoading || !templateIds.length || !!error}
                            >
                                <FilterAlt sx={{ mr: 1 }} />
                                {t("filters")}
                            </Button>
                        </Box>
                        <Box display="flex">
                            <Button
                                color="grey"
                                onClick={() => setIsDeleting(true)}
                                disabled={!canDelete || !user || isLoading || !templateIds.length || !!error}
                            >
                                <Delete fontSize="small" sx={{ mr: 1 }} />
                                {t("deleteAllForms")}
                            </Button>
                        </Box>
                    </Box>
                </>
            </Box>
            {isLoading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : (
                <ScrollBox py={2}>
                    {!error && templateIds.length ? (
                        <List dense disablePadding>
                            {templateIds.map((templateId) => (
                                <Template templateId={templateId} key={templateId} />
                            ))}
                        </List>
                    ) : (
                        <Typography px={1}>
                            {!user ? "Please log in to your account to view the forms." : "No forms."}
                        </Typography>
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
