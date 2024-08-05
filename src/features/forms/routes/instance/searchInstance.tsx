import { ArrowBack, Clear, Download, FlightTakeoff, MoreVert } from "@mui/icons-material";
import {
    Box,
    Button,
    IconButton,
    LinearProgress,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Typography,
    useTheme,
} from "@mui/material";
import { Fragment, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, ScrollBox } from "components";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { useFlyToForm } from "features/forms/hooks/useFlyToForm";
import { selectCurrentFormsList } from "features/forms/slice";
import { renderActions } from "features/render";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { useSceneId } from "hooks/useSceneId";
import { selectHasAdminCapabilities } from "slices/explorer";
import { selectAccessToken, selectConfig } from "slices/explorer";

import { useGetSearchFormQuery, useUpdateSearchFormMutation } from "../../api";
import { type Form, type FormId, type FormItem as FItype, FormItemType, type FormObjectGuid } from "../../types";
import { determineHighlightCollection, toFormFields, toFormItems } from "../../utils";
import { FormItem } from "./formItem";

export function SearchInstance() {
    const { objectGuid, formId } = useParams<{ objectGuid: FormObjectGuid; formId: FormId }>();
    const theme = useTheme();
    const history = useHistory();
    const sceneId = useSceneId();
    const currentFormsList = useAppSelector(selectCurrentFormsList);
    const formsBaseUrl = useAppSelector(selectConfig).dataV2ServerUrl + "/forms/";
    const accessToken = useAppSelector(selectAccessToken);
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const { idArr: highlighted } = useHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const flyToForm = useFlyToForm();
    const checkPermission = useCheckProjectPermission();
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const canManage = (checkPermission(Permission.FormsManage) || checkPermission(Permission.SceneManage)) ?? isAdmin;
    const canEdit = checkPermission(Permission.FormsFill) ?? canManage;

    const willUnmount = useRef(false);
    const [items, setItems] = useState<FItype[]>([]);
    const [isUpdated, setIsUpdated] = useState(false);
    const didHighlightId = useRef(false);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const { data: form, isLoading: isFormLoading } = useGetSearchFormQuery({
        projectId: sceneId,
        objectGuid,
        formId,
    });

    const [updateForm, { isLoading: isFormUpdating }] = useUpdateSearchFormMutation();

    const objectId = useMemo(
        () => (history.location?.state as { objectId?: number })?.objectId,
        [history.location.state]
    );

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

    useEffect(() => {
        return () => {
            if (willUnmount.current) {
                if (isUpdated) {
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
                                [objectId!]
                            )
                        );
                    });
                }
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
                }
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

    const handleClearClick = useCallback(() => {
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
            })
        );
        setIsUpdated(true);
        closeMenu();
    }, []);

    const handleFlyTo = useCallback(() => {
        if (!objectGuid) {
            return;
        }

        flyToForm({ objectGuid });
    }, [flyToForm, objectGuid]);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <Button color="grey" onClick={handleBackClick}>
                            <ArrowBack sx={{ mr: 1 }} />
                            Back
                        </Button>
                        {items?.length ? (
                            <>
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
                                        <MenuItem onClick={handleClearClick} disabled={!canEdit}>
                                            <ListItemIcon>
                                                <Clear fontSize="small" />
                                            </ListItemIcon>
                                            <ListItemText>Clear</ListItemText>
                                        </MenuItem>
                                    </Menu>
                                </>
                            </>
                        ) : undefined}
                    </Box>
                </>
            </Box>
            {(isFormLoading || isFormUpdating) && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox p={1} pt={2} pb={3}>
                <Typography fontWeight={600} mb={2}>
                    {form?.title}
                </Typography>
                {items?.length === 0 && <Typography px={0}>Selected object doesn't have any forms.</Typography>}
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
            </ScrollBox>
        </>
    );
}
