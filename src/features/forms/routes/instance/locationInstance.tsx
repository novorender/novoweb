import { ArrowBack, Clear, Create, Delete, Download, FlightTakeoff, History, MoreVert } from "@mui/icons-material";
import {
    Alert,
    Box,
    Button,
    FormControlLabel,
    IconButton,
    LinearProgress,
    List,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import { type FormEvent, Fragment, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation, Divider, IosSwitch, ScrollBox, TextField } from "components";
import {
    useDeleteLocationFormMutation,
    useGetLocationFormQuery,
    useSignLocationFormMutation,
    useUpdateLocationFormMutation,
} from "features/forms/api";
import { Signature, Signatures } from "features/forms/components/signatures";
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
import { useToggle } from "hooks/useToggle";
import { selectUser } from "slices/authSlice";
import { selectAccessToken, selectConfig } from "slices/explorer";

import { FormItem } from "./formItem";

export function LocationInstance() {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const sceneId = useSceneId();
    const currentFormsList = useAppSelector(selectCurrentFormsList);
    const formsBaseUrl = useAppSelector(selectConfig).dataV2ServerUrl + "/forms/";
    const accessToken = useAppSelector(selectAccessToken);
    const user = useAppSelector(selectUser);
    const dispatch = useAppDispatch();
    const flyToForm = useFlyToForm();
    const dispatchFormsGlobals = useDispatchFormsGlobals();
    const lazyFormsGlobals = useLazyFormsGlobals();
    const checkPermission = useCheckProjectPermission();
    const canDelete = checkPermission(Permission.FormsDelete);
    const canEdit = checkPermission(Permission.FormsFill);

    const location = useLocation();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const templateId = queryParams.get("templateId") as TemplateId;
    const formId = queryParams.get("formId") as FormId;

    const willUnmount = useRef(false);
    const [items, setItems] = useState<FItype[]>([]);
    const [isUpdated, setIsUpdated] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isSigning, setIsSigning] = useState(false);
    const [isFinalSignature, toggleFinalSignature] = useToggle(false);
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

    const isFinal = useMemo(() => form?.isFinal ?? false, [form]);
    const finalSignature = useMemo(
        () => (form?.isFinal ? form.signatures?.find((s) => s.isFinal) : undefined),
        [form?.isFinal, form?.signatures],
    );

    useEffect(() => {
        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));
        dispatch(formsActions.setSelectedFormId(formId));
    }, [dispatch, formId]);

    const [updateForm, { isLoading: isFormUpdating }] = useUpdateLocationFormMutation();
    const [signForm] = useSignLocationFormMutation();
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
                }),
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

    const maybeUpdateForm = useCallback(() => {
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
                    ]),
                );
            }
            updateForm({
                projectId: sceneId,
                templateId,
                formId,
                form,
            });
            setIsUpdated(false);
        }
    }, [sceneId, templateId, formId, isUpdated, items, title, updateForm, lazyFormsGlobals, dispatch]);

    useEffect(
        () => () => {
            if (shouldUpdateForm.current) {
                maybeUpdateForm();
                shouldUpdateForm.current = false;
            }
        },
        [maybeUpdateForm],
    );

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
                },
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

    const handleClear = useCallback((e: FormEvent) => {
        e.preventDefault();
        closeMenu();
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
            }),
        );
        setIsClearing(false);
        setIsUpdated(true);
    }, []);

    const handleCancelClear = useCallback(() => {
        closeMenu();
        setIsClearing(false);
    }, []);

    const handleSign = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            closeMenu();

            signForm({
                projectId: sceneId,
                templateId,
                formId,
                isFinal: isFinalSignature,
            }).then((res) => {
                if ("error" in res) {
                    console.error(res.error);
                    return;
                }
            });

            setIsSigning(false);
        },
        [isFinalSignature, signForm, sceneId, templateId, formId],
    );

    const handleCancelSign = useCallback(() => {
        closeMenu();
        setIsSigning(false);
    }, []);

    const handleTitleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const title = e.target.value;
            setTitle(title);
            if (title.trim().length > 0) {
                setIsUpdated(true);
            }
        },
        [setTitle],
    );

    const handleFlyTo = useCallback(() => {
        if (!form?.location) {
            return;
        }

        flyToForm({ location: form.location });
    }, [flyToForm, form?.location]);

    const handleSignBtnClick = useCallback(() => {
        maybeUpdateForm();
        setIsSigning(true);
    }, [maybeUpdateForm]);

    const handleHistoryClick = useCallback(() => {}, []);

    const handleDelete = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            closeMenu();
            await deleteForm({
                projectId: sceneId,
                templateId,
                formId,
            });
            dispatch(formsActions.setSelectedFormId(undefined));
            history.goBack();
        },
        [sceneId, templateId, formId, deleteForm, dispatch, history],
    );

    const handleCancelDelete = useCallback(() => {
        closeMenu();
        setIsDeleting(false);
    }, []);

    return isDeleting ? (
        <Confirmation
            title={t("deleteForm", { title })}
            confirmBtnText={t("delete")}
            onCancel={handleCancelDelete}
            component="form"
            onSubmit={handleDelete}
            loading={isFormDeleting}
            headerShadow={false}
        />
    ) : isClearing ? (
        <Confirmation
            title={t("clearForm", { title: form?.title })}
            confirmBtnText={t("clear")}
            onCancel={handleCancelClear}
            component="form"
            onSubmit={handleClear}
            headerShadow={false}
        />
    ) : isSigning ? (
        <Confirmation
            title={t("signForm", { title, user: user?.name ?? user?.user ?? t("unknown") })}
            confirmBtnText={t("sign")}
            onCancel={handleCancelSign}
            component="form"
            onSubmit={handleSign}
            headerShadow={false}
            paddingBottom={0}
        >
            <FormControlLabel
                control={
                    <IosSwitch
                        size="medium"
                        color="primary"
                        checked={isFinalSignature}
                        onChange={() => toggleFinalSignature()}
                    />
                }
                label={<Typography>{t("signatureIsFinal")}</Typography>}
                sx={{ mb: isFinalSignature ? 0 : 8 }}
            />
            {isFinalSignature && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {t("finalSignatureWarning")}
                </Alert>
            )}
        </Confirmation>
    ) : (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box m={1} display="flex" justifyContent="space-between">
                    <Button color="grey" onClick={handleBack}>
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                    <Button color="grey" onClick={handleFlyTo}>
                        <FlightTakeoff sx={{ mr: 1 }} />
                        {t("flyTo")}
                    </Button>
                    <>
                        <IconButton edge="start" size="small" onClick={openMenu} sx={{ mr: 1 }}>
                            <MoreVert fontSize="small" />
                        </IconButton>
                        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
                            <MenuItem onClick={handleSignBtnClick} disabled={!canEdit || isFinal}>
                                <ListItemIcon>
                                    <Create fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>{t("sign")}</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={handleHistoryClick}>
                                <ListItemIcon>
                                    <History fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>{t("history")}</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={handleExportAsPdf}>
                                <ListItemIcon>
                                    <Download fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>{t("exportAsPDF")}</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={() => setIsDeleting(true)} disabled={!canDelete}>
                                <ListItemIcon>
                                    <Delete fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>{t("delete")}</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={() => setIsClearing(true)} disabled={!canEdit || isFinal}>
                                <ListItemIcon>
                                    <Clear fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>{t("clear")}</ListItemText>
                            </MenuItem>
                        </Menu>
                    </>
                </Box>
            </Box>
            {(isFormLoading || isFormUpdating) && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox p={1} pt={2} pb={3}>
                <Box mt={2} mb={isFinal ? 0 : 2}>
                    <TextField
                        label="Form name"
                        value={title}
                        onChange={handleTitleChange}
                        fullWidth
                        disabled={!canEdit || isFinal}
                    />
                </Box>
                {finalSignature && (
                    <List dense sx={{ my: 2, bgcolor: theme.palette.grey[100] }}>
                        <Signature signature={finalSignature!} />
                    </List>
                )}
                {items?.map((item, idx, array) => {
                    return (
                        <Fragment key={item.id}>
                            <FormItem
                                item={item}
                                setItems={(itm) => {
                                    setItems(itm);
                                    setIsUpdated(true);
                                }}
                                disabled={!canEdit || isFinal}
                            />
                            {idx !== array.length - 1 ? <Divider sx={{ mt: 1, mb: 2 }} /> : null}
                        </Fragment>
                    );
                })}
                <Stack gap={1} mt={2}>
                    <TransformEditor disabled={!canEdit || isFinal} />
                    <Signatures signatures={form?.signatures} />
                </Stack>
            </ScrollBox>
        </>
    );
}
