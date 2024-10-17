import { ArrowBack, Clear, Create, Delete, Download, FlightTakeoff, History, MoreVert } from "@mui/icons-material";
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
import { MouseEvent, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Route, Switch, useHistory, useLocation, useRouteMatch } from "react-router-dom";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider } from "components";
import { useGetLocationFormQuery, useUpdateLocationFormMutation } from "features/forms/api";
import { formsGlobalsActions, useDispatchFormsGlobals, useLazyFormsGlobals } from "features/forms/formsGlobals";
import { useFlyToForm } from "features/forms/hooks/useFlyToForm";
import { formsActions, selectCurrentFormsList } from "features/forms/slice";
import {
    type Form as FormType,
    type FormId,
    type FormItem,
    FormItemType,
    type FormRecord,
    type TemplateId,
} from "features/forms/types";
import { toFormFields, toFormItems } from "features/forms/utils";
import { ObjectVisibility, renderActions } from "features/render";
import { ShareLink } from "features/shareLink";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { useSceneId } from "hooks/useSceneId";
import { selectAccessToken, selectConfig } from "slices/explorer";

import { CLEAR_ROUTE, DELETE_ROUTE, HISTORY_ROUTE, SIGN_ROUTE } from "./constants";
import { ClearConfirmation, DeleteConfirmation, SignConfirmation } from "./dialogs";
import { Form } from "./form";
import { FormHistory } from "./formHistory";

export function LocationInstance() {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const match = useRouteMatch();
    const projectId = useSceneId();
    const currentFormsList = useAppSelector(selectCurrentFormsList);
    const formsBaseUrl = useAppSelector(selectConfig).dataV2ServerUrl + "/forms/";
    const accessToken = useAppSelector(selectAccessToken);
    const dispatch = useAppDispatch();
    const flyToForm = useFlyToForm();
    const dispatchFormsGlobals = useDispatchFormsGlobals();
    const lazyFormsGlobals = useLazyFormsGlobals();
    const checkPermission = useCheckProjectPermission();
    const canDelete = checkPermission(Permission.FormsDelete);
    const canEdit = checkPermission(Permission.FormsFill);
    const canSign = checkPermission(Permission.FormsSign);

    const location = useLocation();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const templateId = queryParams.get("templateId") as TemplateId;
    const formId = queryParams.get("formId") as FormId;

    const signRoute = useMemo(() => `${match.path}${SIGN_ROUTE}`, [match.path]);
    const historyRoute = useMemo(() => `${match.path}${HISTORY_ROUTE}`, [match.path]);
    const deleteRoute = useMemo(() => `${match.path}${DELETE_ROUTE}`, [match.path]);
    const clearRoute = useMemo(() => `${match.path}${CLEAR_ROUTE}`, [match.path]);

    const willUnmount = useRef(false);
    const [items, setItems] = useState<FormItem[]>([]);
    const [isUpdated, setIsUpdated] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const {
        data: form,
        currentData: currentForm,
        isLoading: isFormLoading,
    } = useGetLocationFormQuery({
        projectId,
        templateId,
        formId,
    });

    const isFinal = useMemo(() => form?.isFinal ?? false, [form]);

    useEffect(() => {
        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));
        dispatch(formsActions.setSelectedFormId(formId));
    }, [dispatch, formId]);

    const [updateForm, { isLoading: isFormUpdating }] = useUpdateLocationFormMutation();

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
            const form: Partial<FormType> = {
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
                projectId,
                templateId,
                formId,
                form,
            });
            setIsUpdated(false);
        }
    }, [projectId, templateId, formId, isUpdated, items, title, updateForm, lazyFormsGlobals, dispatch]);

    useEffect(
        () => () => {
            if (shouldUpdateForm.current) {
                maybeUpdateForm();
                shouldUpdateForm.current = false;
            }
        },
        [maybeUpdateForm],
    );

    useEffect(
        () => () => {
            dispatchFormsGlobals(formsGlobalsActions.setTransformDraft(undefined));
        },
        [dispatchFormsGlobals],
    );

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const handleExportAsPdf = useCallback(async () => {
        closeMenu();

        if (!formsBaseUrl) {
            return;
        }

        try {
            const response = await fetch(
                `${formsBaseUrl}projects/${projectId}/location/${templateId}/${formId}/download`,
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
    }, [accessToken, formId, formsBaseUrl, projectId, templateId, title]);

    const handleBack = useCallback(() => {
        if (currentFormsList) {
            history.push(`/forms/${currentFormsList}`);
        } else {
            history.goBack();
        }
        dispatch(formsActions.setSelectedFormId(undefined));
    }, [currentFormsList, history, dispatch]);

    const handleClear = useCallback(() => {
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
        setIsUpdated(true);
    }, []);

    const handleTitleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            e.stopPropagation();
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
        closeMenu();
        maybeUpdateForm();
        history.push({
            pathname: signRoute,
            search: `?templateId=${templateId}&formId=${formId}`,
        });
    }, [formId, history, maybeUpdateForm, signRoute, templateId]);

    const handleHistoryClick = useCallback(() => {
        closeMenu();
        maybeUpdateForm();
        history.push({
            pathname: historyRoute,
            search: `?templateId=${templateId}&formId=${formId}`,
        });
    }, [formId, history, historyRoute, maybeUpdateForm, templateId]);

    const handleDeleteClick = useCallback(() => {
        closeMenu();
        history.push({
            pathname: deleteRoute,
            search: `?templateId=${templateId}&formId=${formId}`,
        });
    }, [deleteRoute, formId, history, templateId]);

    const handleClearBtnClick = useCallback(() => {
        closeMenu();
        history.push({
            pathname: clearRoute,
            search: `?templateId=${templateId}&formId=${formId}`,
        });
    }, [history, clearRoute, templateId, formId]);

    const handleSetItems = useCallback(
        (item: SetStateAction<FormItem[]>) => {
            setItems(item);
            setIsUpdated(true);
        },
        [setItems],
    );

    return (
        <Switch>
            <Route exact path={match.path}>
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
                            <IconButton
                                edge="start"
                                size="small"
                                onClick={openMenu}
                                sx={{ mr: 1 }}
                                disabled={isFormLoading || isFormUpdating || items.length === 0}
                            >
                                <MoreVert fontSize="small" />
                            </IconButton>
                            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
                                <MenuItem onClick={handleSignBtnClick} disabled={!canSign || isFinal}>
                                    <ListItemIcon>
                                        <Create fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText>{t("sign")}</ListItemText>
                                </MenuItem>
                                <ShareLink variant="menuItem" nameKey="share" onClick={closeMenu} />
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
                                <MenuItem onClick={handleDeleteClick} disabled={!canDelete}>
                                    <ListItemIcon>
                                        <Delete fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText>{t("delete")}</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={handleClearBtnClick} disabled={!canEdit || isFinal}>
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
                <Form
                    form={form}
                    items={items}
                    setItems={handleSetItems}
                    title={title}
                    handleTitleChange={handleTitleChange}
                />
            </Route>
            <Route path={signRoute}>
                <SignConfirmation templateId={templateId} formId={formId} title={title} />
            </Route>
            <Route path={historyRoute}>
                <FormHistory title={title} templateId={templateId} formId={formId} isFinal={isFinal} />
            </Route>
            <Route path={deleteRoute}>
                <DeleteConfirmation title={title} templateId={templateId} formId={formId} />
            </Route>
            <Route path={clearRoute}>
                <ClearConfirmation title={title} onClear={handleClear} />
            </Route>
        </Switch>
    );
}
