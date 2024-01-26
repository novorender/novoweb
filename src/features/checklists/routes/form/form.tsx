import { ArrowBack, Clear } from "@mui/icons-material";
import { Box, Button, LinearProgress, Typography, useTheme } from "@mui/material";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch } from "app/store";
import { Divider, ScrollBox } from "components";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { ObjectVisibility, renderActions } from "features/render";
import { useSceneId } from "hooks/useSceneId";

import { useGetFormQuery, useUpdateFormMutation } from "../../api";
import { type ChecklistItem, type FormId, type FormObjectGuid } from "../../types";
import { toChecklistItems, toFormFields } from "../../utils";
import { FormItem } from "./formItem";

export function Form() {
    const { objectGuid, formId } = useParams<{ objectGuid: FormObjectGuid; formId: FormId }>();
    const theme = useTheme();
    const history = useHistory();
    const sceneId = useSceneId();
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();

    const willUnmount = useRef(false);
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [isUpdated, setIsUpdated] = useState(false);

    const { data: form, isLoading: isFormLoading } = useGetFormQuery({
        projectId: sceneId,
        objectGuid,
        formId,
    });

    const [updateForm, { isLoading: isFormUpdating }] = useUpdateFormMutation();

    useEffect(() => {
        if (form?.fields) {
            setItems(toChecklistItems(form.fields));
        }
    }, [form]);

    useEffect(() => {
        return () => {
            willUnmount.current = true;
        };
    }, []);

    useEffect(
        () => () => {
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
                    !history.location.pathname.startsWith("/checklist") &&
                    !history.location.pathname.startsWith("/object")
                ) {
                    dispatchHighlighted(highlightActions.setIds([]));
                    dispatchHighlightCollections(highlightCollectionsActions.clearAll());
                    dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
                    dispatchHighlighted(highlightActions.resetColor());
                }
            }
        },
        [
            history.location.pathname,
            dispatch,
            dispatchHighlighted,
            dispatchHighlightCollections,
            isUpdated,
            items,
            updateForm,
            sceneId,
            objectGuid,
            formId,
        ]
    );

    const handleClearClick = useCallback(() => {
        setItems((state) => state.map((item) => ({ ...item, value: null })));
        setIsUpdated(true);
    }, []);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <Button color="grey" onClick={history.goBack}>
                            <ArrowBack sx={{ mr: 1 }} />
                            Back
                        </Button>
                        <Button color="grey" onClick={handleClearClick}>
                            <Clear sx={{ mr: 1 }} />
                            Clear
                        </Button>
                    </Box>
                </>
            </Box>
            {(isFormLoading || isFormUpdating) && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox p={1} pt={2} pb={3} component={"form"}>
                <Typography fontWeight={600} mb={2}>
                    {form?.title}
                </Typography>
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
