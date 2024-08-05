import { ArrowBack, Clear, Delete, Download, FlightTakeoff, MoreVert } from "@mui/icons-material";
import {
    Box,
    Button,
    IconButton,
    LinearProgress,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    useTheme,
} from "@mui/material";
import { type FormEvent, Fragment, MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation, Divider, ScrollBox, TextField } from "components";
import {
    useDeleteLocationFormMutation,
    useGetLocationFormQuery,
    useUpdateLocationFormMutation,
} from "features/forms/api";
import { TransformEditor } from "features/forms/components/transformEditor";
import { formsGlobalsActions, useDispatchFormsGlobals, useLazyFormsGlobals } from "features/forms/formsGlobals";
import { useFlyToForm } from "features/forms/hooks/useFlyToForm";
import { formsActions, selectCurrentFormsList } from "features/forms/slice";
import {
    type Form,
    type FormId,
    type FormItem as FItype,
    FormItemType,
    type FormRecord,
    type TemplateId,
} from "features/forms/types";
import { toFormFields, toFormItems } from "features/forms/utils";
import { ObjectVisibility, renderActions } from "features/render";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { useSceneId } from "hooks/useSceneId";
import { selectHasAdminCapabilities } from "slices/explorer";
import { selectAccessToken, selectConfig } from "slices/explorer";

import { FormItem } from "./formItem";

export function LocationInstance() {
    const { templateId, formId } = useParams<{ templateId: TemplateId; formId: FormId }>();
    const theme = useTheme();
    const history = useHistory();
    const sceneId = useSceneId();
    const currentFormsList = useAppSelector(selectCurrentFormsList);
    const formsBaseUrl = useAppSelector(selectConfig).dataV2ServerUrl + "/forms/";
    const accessToken = useAppSelector(selectAccessToken);
    const dispatch = useAppDispatch();
    const flyToForm = useFlyToForm();
    const dispatchFormsGlobals = useDispatchFormsGlobals();
    const lazyFormsGlobals = useLazyFormsGlobals();
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const checkPermission = useCheckProjectPermission();
    const canDelete = checkPermission(Permission.FormsDelete) ?? isAdmin;
    const canEdit = checkPermission(Permission.FormsFill) ?? isAdmin;

    const willUnmount = useRef(false);
    const [items, setItems] = useState<FItype[]>([]);
    const [isUpdated, setIsUpdated] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const {
        data: form,
        currentData: currentForm,
        isLoading: isFormLoading,
    } = useGetLocationFormQuery({
        projectId: sceneId,
        templateId,
        formId,
    });

    useEffect(() => {
        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));
        dispatch(formsActions.setSelectedFormId(formId));
    }, [dispatch, formId]);

    const [updateForm, { isLoading: isFormUpdating }] = useUpdateLocationFormMutation();

    const [deleteForm, { isLoading: isFormDeleting }] = useDeleteLocationFormMutation();

    const [title, setTitle] = useState(form?.title || formId);

    useEffect(() => {
        if (form?.fields) {
            setItems(toFormItems(form.fields));
        }
        setTitle(form?.title || formId);
    }, [form, formId]);

    useEffect(() => {
        if (templateId && formId && currentForm?.location) {
            dispatchFormsGlobals(
                formsGlobalsActions.setTransformDraft({
                    templateId,
                    formId,
                    location: currentForm.location,
                    rotation: currentForm.rotation,
                    scale: currentForm.scale,
                    updated: false,
                })
            );
        }
    }, [templateId, formId, currentForm, dispatchFormsGlobals]);

    useEffect(() => {
        willUnmount.current = false;
        return () => {
            willUnmount.current = true;
        };
    }, []);

    const shouldUpdateForm = useRef(false);
    useEffect(() => {
        shouldUpdateForm.current = false;
        return () => {
            shouldUpdateForm.current = true;
        };
    }, [templateId, formId]);

    useEffect(() => {
        return () => {
            if (shouldUpdateForm.current) {
                // eslint-disable-next-line react-hooks/exhaustive-deps
                const transformDraft = lazyFormsGlobals.current.transformDraft;

                if (isUpdated || transformDraft?.updated) {
                    const form: Partial<Form> = {
                        title: title.trim().length > 0 ? title.trim() : formId,
                        fields: toFormFields(items),
                    };
                    if (transformDraft?.updated) {
                        form.location = transformDraft.location;
                        form.rotation = transformDraft.rotation;
                        form.scale = transformDraft.scale;

                        // Optimistic update so the form doesn't jump back and forth
                        dispatch(
                            formsActions.addLocationForms([
                                {
                                    ...(form as FormRecord),
                                    id: formId,
                                    templateId,
                                },
                            ])
                        );
                    }
                    updateForm({
                        projectId: sceneId,
                        templateId,
                        formId,
                        form,
                    });
                }

                shouldUpdateForm.current = false;
                setIsUpdated(false);
            }
        };
    }, [
        sceneId,
        templateId,
        formId,
        isUpdated,
        items,
        title,
        updateForm,
        lazyFormsGlobals,
        dispatchFormsGlobals,
        dispatch,
    ]);

    useEffect(() => {
        return () => {
            dispatchFormsGlobals(formsGlobalsActions.setTransformDraft(undefined));
        };
    }, [dispatchFormsGlobals]);

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const handleExportAsPdf = useCallback(async () => {
        if (!formsBaseUrl) {
            return;
        }

        try {
            const response = await fetch(
                `${formsBaseUrl}projects/${sceneId}/location/${templateId}/${formId}/download`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        Pragma: "no-cache",
                        Expires: "0",
                    },
                }
            );

            if (!response.ok) {
                console.error(`Failed to export form as PDF`);
            }

            const pdfBlob = await response.blob();
            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${title ?? "Novorender form"}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(`Failed to export form as PDF: ${err}`);
        }
        closeMenu();
    }, [accessToken, formId, formsBaseUrl, sceneId, templateId, title]);

    const handleBack = useCallback(() => {
        if (currentFormsList) {
            history.push(`/forms/${currentFormsList}`);
        } else {
            history.goBack();
        }
        dispatch(formsActions.setSelectedFormId(undefined));
    }, [currentFormsList, history, dispatch]);

    const handleClearClick = useCallback(() => {
        setItems((state) =>
            state.map((item) => {
                switch (item.type) {
                    case FormItemType.File:
                        return {
                            ...item,
                            value: [],
                        };
                    case FormItemType.Text:
                        return item;
                    case FormItemType.Date:
                    case FormItemType.Time:
                    case FormItemType.DateTime:
                        return {
                            ...item,
                            value: undefined,
                        };
                    default:
                        return {
                            ...item,
                            value: null,
                        };
                }
            })
        );
        setIsUpdated(true);
        closeMenu();
    }, []);

    const handleTitleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const title = e.target.value;
            setTitle(title);
            if (title.trim().length > 0) {
                setIsUpdated(true);
            }
        },
        [setTitle]
    );

    const handleFlyTo = useCallback(() => {
        if (!form?.location) {
            return;
        }

        flyToForm({ location: form.location });
    }, [flyToForm, form?.location]);

    const handleDelete = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            await deleteForm({
                projectId: sceneId,
                templateId,
                formId,
            });
            dispatch(formsActions.setSelectedFormId(undefined));
            history.goBack();
        },
        [sceneId, templateId, formId, deleteForm, dispatch, history]
    );

    return isDeleting ? (
        <Confirmation
            title={`Delete form "${title}"?`}
            confirmBtnText="Delete"
            onCancel={() => setIsDeleting(false)}
            component="form"
            onSubmit={handleDelete}
            loading={isFormDeleting}
        />
    ) : (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <Button color="grey" onClick={handleBack}>
                            <ArrowBack sx={{ mr: 1 }} />
                            Back
                        </Button>
                        <Button color="grey" onClick={handleFlyTo}>
                            <FlightTakeoff sx={{ mr: 1 }} />
                            Fly to
                        </Button>
                        <>
                            <IconButton edge="start" size="small" onClick={openMenu} sx={{ mr: 1 }}>
                                <MoreVert fontSize="small" />
                            </IconButton>
                            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
                                <MenuItem onClick={handleExportAsPdf}>
                                    <ListItemIcon>
                                        <Download fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText>Export as PDF</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => setIsDeleting(true)} disabled={!canDelete}>
                                    <ListItemIcon>
                                        <Delete fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText>Delete</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={handleClearClick} disabled={!canEdit}>
                                    <ListItemIcon>
                                        <Clear fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText>Clear</ListItemText>
                                </MenuItem>
                            </Menu>
                        </>
                    </Box>
                </>
            </Box>
            {(isFormLoading || isFormUpdating) && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox p={1} pt={2} pb={3}>
                <Box my={2}>
                    <TextField
                        label="Form name"
                        value={title}
                        onChange={handleTitleChange}
                        fullWidth
                        disabled={!canEdit}
                    />
                </Box>
                {items?.map((item, idx, array) => {
                    return (
                        <Fragment key={item.id}>
                            <FormItem
                                item={item}
                                setItems={(itm) => {
                                    setItems(itm);
                                    setIsUpdated(true);
                                }}
                                disabled={!canEdit}
                            />
                            {idx !== array.length - 1 ? <Divider sx={{ mt: 1, mb: 2 }} /> : null}
                        </Fragment>
                    );
                })}
                <Box mt={2}>
                    <TransformEditor />
                </Box>
            </ScrollBox>
        </>
    );
}
