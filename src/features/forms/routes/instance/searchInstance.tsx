import { ArrowBack, Clear, Create, Download, FlightTakeoff, History, MoreVert } from "@mui/icons-material";
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
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useFlyToForm } from "features/forms/hooks/useFlyToForm";
import { formsActions, selectCurrentFormsList, selectForms, selectSelectedFormObjectId } from "features/forms/slice";
import {
    type Form as FormType,
    type FormId,
    type FormItem,
    FormItemType,
    type FormObjectGuid,
} from "features/forms/types";
import { determineHighlightCollection, mapGuidsToIds, toFormFields, toFormItems } from "features/forms/utils";
import { ObjectVisibility, renderActions } from "features/render";
import { ShareLink } from "features/shareLink";
import { useAbortController } from "hooks/useAbortController";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { useSceneId } from "hooks/useSceneId";
import { selectAccessToken, selectConfig } from "slices/explorer";

import { useGetSearchFormQuery, useUpdateSearchFormMutation } from "../../api";
import { CLEAR_ROUTE, HIGHLIGHT_COLOR, HISTORY_ROUTE, SIGN_ROUTE } from "./constants";
import { ClearConfirmation, SignConfirmation } from "./dialogs";
import { Form } from "./form";
import { FormHistory } from "./formHistory";

export function SearchInstance() {
    const { t } = useTranslation();
    const {
        state: { db },
    } = useExplorerGlobals(true);
    const theme = useTheme();
    const history = useHistory();
    const match = useRouteMatch();
    const projectId = useSceneId();
    const currentFormsList = useAppSelector(selectCurrentFormsList);
    const formsBaseUrl = useAppSelector(selectConfig).dataV2ServerUrl + "/forms/";
    const accessToken = useAppSelector(selectAccessToken);
    const objectId = useAppSelector(selectSelectedFormObjectId);
    const forms = useAppSelector(selectForms);
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const flyToForm = useFlyToForm();
    const checkPermission = useCheckProjectPermission();
    const canEdit = checkPermission(Permission.FormsFill);
    const canSign = checkPermission(Permission.FormsSign);
    const [abortController, abort] = useAbortController();

    const location = useLocation();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const objectGuid = queryParams.get("objectGuid") as FormObjectGuid;
    const formId = queryParams.get("formId") as FormId;

    const signRoute = useMemo(() => `${match.path}${SIGN_ROUTE}`, [match.path]);
    const historyRoute = useMemo(() => `${match.path}${HISTORY_ROUTE}`, [match.path]);
    const clearRoute = useMemo(() => `${match.path}${CLEAR_ROUTE}`, [match.path]);

    const willUnmount = useRef(false);
    const [items, setItems] = useState<FormItem[]>([]);
    const [isUpdated, setIsUpdated] = useState(false);
    const didHighlightId = useRef(false);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const { data: form, isLoading: isFormLoading } = useGetSearchFormQuery({
        projectId,
        objectGuid,
        formId,
    });

    const isFinal = useMemo(() => form?.isFinal ?? false, [form]);

    const [updateForm, { isLoading: isFormUpdating }] = useUpdateSearchFormMutation();

    const [title, setTitle] = useState(form?.title ?? "");

    useEffect(() => {
        let isGuidCurrent = true;

        async function fetchObjectId() {
            try {
                const map = await mapGuidsToIds({
                    guids: [objectGuid],
                    db,
                    abortSignal: abortController.current.signal,
                });

                if (isGuidCurrent && objectGuid === forms.selectedFormObjectGuid) {
                    dispatch(formsActions.setSelectedFormObjectId(map[objectGuid]));
                }
            } catch {
                // nada
            }
        }

        if (!Number.isInteger(objectId) && objectGuid) {
            fetchObjectId();
        }

        return () => {
            isGuidCurrent = false;
            abort();
        };
    }, [objectGuid, db, abortController, dispatch, objectId, queryParams, abort, forms.selectedFormObjectGuid]);

    useEffect(() => {
        if (!Number.isInteger(objectId) || didHighlightId.current) {
            return;
        }
        dispatchHighlighted(highlightActions.set({ ids: [objectId!], color: HIGHLIGHT_COLOR }));
        didHighlightId.current = true;
    }, [dispatchHighlighted, objectId]);

    useEffect(() => {
        if (form?.fields) {
            setItems(toFormItems(form.fields));
        }
        if (form?.title) {
            setTitle(form?.title);
        }
    }, [form]);

    useEffect(() => {
        willUnmount.current = false;
        return () => {
            willUnmount.current = true;
        };
    }, []);

    useEffect(() => {
        if (currentFormsList !== formId) {
            dispatch(formsActions.setSelectedFormId(formId));
        }
        dispatch(formsActions.setSelectedFormObjectGuid(objectGuid));
        dispatch(formsActions.setSelectedFormObjectId(objectId));
        if (objectId) {
            dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));
        }
    }, [currentFormsList, dispatch, formId, objectGuid, objectId]);

    const maybeUpdateForm = useCallback(() => {
        if (!isUpdated) {
            return;
        }

        updateForm({
            projectId,
            objectGuid,
            formId,
            form: {
                ...(title.trim().length > 0 ? { title } : {}),
                fields: toFormFields(items),
            },
        }).then((res) => {
            if ("error" in res) {
                console.error(res.error);
                return;
            }
            if (!Number.isInteger(objectId)) {
                return;
            }
            dispatchHighlightCollections(
                highlightCollectionsActions.move(
                    determineHighlightCollection(form as FormType),
                    determineHighlightCollection(res.data),
                    [objectId!],
                ),
            );
        });

        setIsUpdated(false);
    }, [
        isUpdated,
        updateForm,
        projectId,
        objectGuid,
        formId,
        title,
        items,
        objectId,
        dispatchHighlightCollections,
        form,
    ]);

    useEffect(() => {
        return () => {
            if (willUnmount.current) {
                maybeUpdateForm();
                if (
                    !history.location.pathname.startsWith("/forms") &&
                    !history.location.pathname.startsWith("/object") &&
                    didHighlightId.current
                ) {
                    dispatchHighlighted(highlightActions.setIds([]));
                    didHighlightId.current = false;
                }
                dispatch(formsActions.setSelectedFormObjectId(undefined));
            }
        };
    }, [dispatch, dispatchHighlighted, history.location.pathname, maybeUpdateForm]);

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
                `${formsBaseUrl}projects/${projectId}/objects/${objectGuid}/forms/${formId}/download`,
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
    }, [accessToken, title, formId, formsBaseUrl, objectGuid, projectId]);

    const handleBackClick = useCallback(() => {
        dispatchHighlighted(highlightActions.setIds([]));
        dispatch(renderActions.setMainObject(undefined));
        dispatch(formsActions.setSelectedFormObjectGuid(undefined));
        dispatch(formsActions.setSelectedFormObjectId(undefined));
        if (currentFormsList) {
            history.push(`/forms/${currentFormsList}`);
        } else {
            history.goBack();
        }
    }, [dispatchHighlighted, dispatch, currentFormsList, history]);

    const handleClear = useCallback(() => {
        setItems((state) =>
            state.map((item): FormItem => {
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
        if (!objectGuid) {
            return;
        }

        flyToForm({ objectGuid });
    }, [flyToForm, objectGuid]);

    const handleSignBtnClick = useCallback(() => {
        closeMenu();
        maybeUpdateForm();
        history.push({
            pathname: signRoute,
            search: `?objectId=${objectId}&objectGuid=${objectGuid}&formId=${formId}`,
        });
    }, [maybeUpdateForm, history, signRoute, objectId, objectGuid, formId]);

    const handleHistoryClick = useCallback(() => {
        closeMenu();
        maybeUpdateForm();
        history.push({
            pathname: historyRoute,
            search: `?objectId=${objectId}&objectGuid=${objectGuid}&formId=${formId}`,
        });
    }, [formId, history, historyRoute, maybeUpdateForm, objectGuid, objectId]);

    const handleClearBtnClick = useCallback(() => {
        closeMenu();
        history.push({
            pathname: clearRoute,
            search: `?objectId=${objectId}&objectGuid=${objectGuid}&formId=${formId}`,
        });
    }, [history, clearRoute, objectId, objectGuid, formId]);

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
                        <Button color="grey" onClick={handleBackClick}>
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
                                <ShareLink
                                    variant="menuItem"
                                    nameKey="share"
                                    explorerStateOverwrite={{
                                        forms: {
                                            ...forms,
                                            currentFormsList: formId,
                                            selectedFormObjectGuid: objectGuid,
                                        },
                                    }}
                                    onClick={closeMenu}
                                />
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
                    noItemsMsg={t("objectHasNoForms")}
                    isLoading={isFormLoading}
                />
            </Route>
            <Route path={signRoute}>
                <SignConfirmation objectGuid={objectGuid} formId={formId} title={title} />
            </Route>
            <Route path={historyRoute}>
                <FormHistory
                    objectId={objectId}
                    objectGuid={objectGuid}
                    templateId={formId}
                    formId={formId}
                    title={title}
                    isFinal={isFinal}
                />
            </Route>
            <Route path={clearRoute}>
                <ClearConfirmation title={title} onClear={handleClear} />
            </Route>
        </Switch>
    );
}
