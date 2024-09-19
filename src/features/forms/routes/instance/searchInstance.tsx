import { ArrowBack, Clear, Create, Download, FlightTakeoff, History, MoreVert } from "@mui/icons-material";
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
    Typography,
    useTheme,
} from "@mui/material";
import { FormEvent, Fragment, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation, Divider, IosSwitch, ScrollBox } from "components";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { Signature, Signatures } from "features/forms/components/signatures";
import { useFlyToForm } from "features/forms/hooks/useFlyToForm";
import { selectCurrentFormsList } from "features/forms/slice";
import { renderActions } from "features/render";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";
import { selectUser } from "slices/authSlice";
import { selectAccessToken, selectConfig } from "slices/explorer";

import { useGetSearchFormQuery, useSignSearchFormMutation, useUpdateSearchFormMutation } from "../../api";
import { type Form, type FormId, type FormItem as FItype, FormItemType, type FormObjectGuid } from "../../types";
import { determineHighlightCollection, toFormFields, toFormItems } from "../../utils";
import { FormItem } from "./formItem";

export function SearchInstance() {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const sceneId = useSceneId();
    const currentFormsList = useAppSelector(selectCurrentFormsList);
    const formsBaseUrl = useAppSelector(selectConfig).dataV2ServerUrl + "/forms/";
    const accessToken = useAppSelector(selectAccessToken);
    const user = useAppSelector(selectUser);
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const { idArr: highlighted } = useHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const flyToForm = useFlyToForm();
    const checkPermission = useCheckProjectPermission();
    const canEdit = checkPermission(Permission.FormsFill);

    const location = useLocation();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const objectGuid = queryParams.get("objectGuid") as FormObjectGuid;
    const formId = queryParams.get("formId") as FormId;
    const objectId = useMemo(
        () => (queryParams.get("objectId") ? Number.parseInt(queryParams.get("objectId")!) : undefined),
        [queryParams],
    );

    const willUnmount = useRef(false);
    const [items, setItems] = useState<FItype[]>([]);
    const [isUpdated, setIsUpdated] = useState(false);
    const didHighlightId = useRef(false);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [isClearing, setIsClearing] = useState(false);
    const [isSigning, setIsSigning] = useState(false);
    const [isFinalSignature, toggleFinalSignature] = useToggle(false);

    const { data: form, isLoading: isFormLoading } = useGetSearchFormQuery({
        projectId: sceneId,
        objectGuid,
        formId,
    });

    const isFinal = useMemo(() => form?.isFinal ?? false, [form]);
    const finalSignature = useMemo(
        () => (form?.isFinal ? form.signatures?.find((s) => s.isFinal) : undefined),
        [form?.isFinal, form?.signatures],
    );

    const [updateForm, { isLoading: isFormUpdating }] = useUpdateSearchFormMutation();
    const [signForm] = useSignSearchFormMutation();

    useEffect(() => {
        if (!objectId || highlighted.includes(objectId)) {
            return;
        }
        dispatchHighlighted(highlightActions.setIds([objectId]));
        didHighlightId.current = true;
    }, [dispatchHighlighted, highlighted, objectId]);

    useEffect(() => {
        if (form?.fields) {
            setItems(toFormItems(form.fields));
        }
    }, [form]);

    useEffect(() => {
        willUnmount.current = false;
        return () => {
            willUnmount.current = true;
        };
    }, []);

    const maybeUpdateForm = useCallback(() => {
        if (!isUpdated) {
            return;
        }

        updateForm({
            projectId: sceneId,
            objectGuid,
            formId,
            form: {
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
                    determineHighlightCollection(form as Form),
                    determineHighlightCollection(res.data),
                    [objectId!],
                ),
            );
        });

        setIsUpdated(false);
    }, [isUpdated, updateForm, sceneId, objectGuid, formId, items, objectId, dispatchHighlightCollections, form]);

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
            }
        };
    }, [
        history.location.pathname,
        dispatchHighlighted,
        isUpdated,
        items,
        updateForm,
        sceneId,
        objectGuid,
        formId,
        form,
        objectId,
        dispatchHighlightCollections,
        maybeUpdateForm,
    ]);

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
                `${formsBaseUrl}projects/${sceneId}/objects/${objectGuid}/forms/${formId}/download`,
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
            link.setAttribute("download", `${form?.title ?? "Novorender form"}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(`Failed to export form as PDF: ${err}`);
        }

        closeMenu();
    }, [accessToken, form?.title, formId, formsBaseUrl, objectGuid, sceneId]);

    const handleBackClick = useCallback(() => {
        dispatchHighlighted(highlightActions.setIds([]));
        dispatch(renderActions.setMainObject(undefined));
        if (currentFormsList) {
            history.push(`/forms/${currentFormsList}`);
        } else {
            history.goBack();
        }
    }, [dispatchHighlighted, dispatch, currentFormsList, history]);

    const handleClear = useCallback((e: FormEvent) => {
        e.preventDefault();
        closeMenu();
        setItems((state) =>
            state.map((item): FItype => {
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
                objectGuid,
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
        [isFinalSignature, sceneId, objectGuid, formId, signForm],
    );

    const handleCancelSign = useCallback(() => {
        closeMenu();
        setIsSigning(false);
    }, []);

    const handleFlyTo = useCallback(() => {
        if (!objectGuid) {
            return;
        }

        flyToForm({ objectGuid });
    }, [flyToForm, objectGuid]);

    const handleSignBtnClick = useCallback(() => {
        maybeUpdateForm();
        setIsSigning(true);
    }, [maybeUpdateForm]);

    const handleHistoryClick = useCallback(() => {}, []);

    return isClearing ? (
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
            title={t("signForm", { title: form?.title, user: user?.name ?? user?.user ?? t("unknown") })}
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
                    <Button color="grey" onClick={handleBackClick}>
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                    {items?.length ? (
                        <>
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
                                    <MenuItem onClick={() => setIsClearing(true)} disabled={!canEdit || isFinal}>
                                        <ListItemIcon>
                                            <Clear fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText>{t("clear")}</ListItemText>
                                    </MenuItem>
                                </Menu>
                            </>
                        </>
                    ) : undefined}
                </Box>
            </Box>
            {(isFormLoading || isFormUpdating) && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox p={1} pt={2} pb={3}>
                <Typography fontWeight={600} mb={isFinal ? 0 : 2}>
                    {form?.title}
                </Typography>
                {finalSignature && (
                    <List dense sx={{ my: 2, bgcolor: theme.palette.grey[100] }}>
                        <Signature signature={finalSignature!} />
                    </List>
                )}
                {items?.length === 0 && <Typography px={0}>{t("objectHasNoForms")}</Typography>}
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
                <Box mt={2}>
                    <Signatures signatures={form?.signatures} />
                </Box>
            </ScrollBox>
        </>
    );
}
