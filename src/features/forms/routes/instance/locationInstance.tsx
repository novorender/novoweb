import { ArrowBack, Clear, FlightTakeoff } from "@mui/icons-material";
import { Box, Button, LinearProgress, useTheme } from "@mui/material";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, ScrollBox, TextField } from "components";
import { useGetLocationFormQuery, useUpdateLocationFormMutation } from "features/forms/api";
import { useFlyToForm } from "features/forms/hooks/useFlyToForm";
import { formsActions, selectCurrentFormsList } from "features/forms/slice";
import { type FormId, type FormItem as FItype, FormItemType, type TemplateId } from "features/forms/types";
import { toFormFields, toFormItems } from "features/forms/utils";
import { useSceneId } from "hooks/useSceneId";

import { FormItem } from "./formItem";

export function LocationInstance() {
    const { templateId, formId } = useParams<{ templateId: TemplateId; formId: FormId }>();
    const theme = useTheme();
    const history = useHistory();
    const sceneId = useSceneId();
    const currentFormsList = useAppSelector(selectCurrentFormsList);
    const dispatch = useAppDispatch();
    const flyToForm = useFlyToForm();

    const willUnmount = useRef(false);
    const [items, setItems] = useState<FItype[]>([]);
    const [isUpdated, setIsUpdated] = useState(false);

    const { data: form, isLoading: isFormLoading } = useGetLocationFormQuery({
        projectId: sceneId,
        templateId,
        formId,
    });

    useEffect(() => {
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
                        templateId,
                        formId,
                        form: {
                            title: title.trim().length > 0 ? title.trim() : formId,
                            fields: toFormFields(items),
                        },
                    });
                }
            }
        };
    }, [sceneId, templateId, formId, isUpdated, items, title, updateForm]);

    const handleBackClick = useCallback(() => {
        if (currentFormsList) {
            history.push(`/forms/${currentFormsList}`);
        } else {
            history.goBack();
        }
        dispatch(formsActions.setSelectedFormId(undefined));
    }, [currentFormsList, history, dispatch]);

    const handleClearClick = useCallback(() => {
        setItems((state) =>
            state.map((item) => ({
                ...item,
                value: item.type !== FormItemType.Text ? null : item.value,
            }))
        );
        setIsUpdated(true);
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
                        <Button color="grey" onClick={handleFlyTo}>
                            <FlightTakeoff sx={{ mr: 1 }} />
                            Fly to
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
            <ScrollBox p={1} pt={2} pb={3}>
                <Box my={2}>
                    <TextField label="Form name" value={title} onChange={handleTitleChange} fullWidth />
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
                            />
                            {idx !== array.length - 1 ? <Divider sx={{ mt: 1, mb: 2 }} /> : null}
                        </Fragment>
                    );
                })}
            </ScrollBox>
        </>
    );
}
