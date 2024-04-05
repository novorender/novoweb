import { ArrowBack, Clear, FlightTakeoff } from "@mui/icons-material";
import { Box, Button, LinearProgress, Typography, useTheme } from "@mui/material";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, ScrollBox } from "components";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { useFlyToForm } from "features/forms/hooks/useFlyToForm";
import { selectCurrentFormsList } from "features/forms/slice";
import { renderActions } from "features/render";
import { useSceneId } from "hooks/useSceneId";

import { useGetSearchFormQuery, useUpdateSearchFormMutation } from "../../api";
import { type FormId, type FormItem as FItype, FormItemType, type FormObjectGuid } from "../../types";
import { toFormFields, toFormItems } from "../../utils";
import { FormItem } from "./formItem";

export function SearchInstance() {
    const { objectGuid, formId } = useParams<{ objectGuid: FormObjectGuid; formId: FormId }>();
    const theme = useTheme();
    const history = useHistory();
    const sceneId = useSceneId();
    const currentFormsList = useAppSelector(selectCurrentFormsList);
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const { idArr: highlighted } = useHighlighted();
    const flyToForm = useFlyToForm();

    const willUnmount = useRef(false);
    const [items, setItems] = useState<FItype[]>([]);
    const [isUpdated, setIsUpdated] = useState(false);
    const didHighlightId = useRef(false);

    const { data: form, isLoading: isFormLoading } = useGetSearchFormQuery({
        projectId: sceneId,
        objectGuid,
        formId,
    });

    const [updateForm, { isLoading: isFormUpdating }] = useUpdateSearchFormMutation();

    useEffect(() => {
        const id = (history.location?.state as { objectId?: number })?.objectId;
        if (!id || highlighted.includes(+id)) {
            return;
        }
        dispatchHighlighted(highlightActions.setIds([+id]));
        didHighlightId.current = true;
    }, [dispatchHighlighted, highlighted, history.location.state]);

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
    }, [history.location.pathname, dispatchHighlighted, isUpdated, items, updateForm, sceneId, objectGuid, formId]);

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
            state.map((item) => ({
                ...item,
                value: item.type !== FormItemType.Text ? null : item.value,
            }))
        );
        setIsUpdated(true);
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
                                <Button color="grey" onClick={handleClearClick}>
                                    <Clear sx={{ mr: 1 }} />
                                    Clear
                                </Button>
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
                            />
                            {idx !== array.length - 1 ? <Divider sx={{ mt: 1, mb: 2 }} /> : null}
                        </Fragment>
                    );
                })}
            </ScrollBox>
        </>
    );
}
