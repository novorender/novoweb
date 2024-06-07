import { ArrowBack, Clear, Delete, FlightTakeoff } from "@mui/icons-material";
import { Box, Button, LinearProgress, useTheme } from "@mui/material";
import { type FormEvent, Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

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
import { type Form, type FormId, type FormItem as FItype, FormItemType, type TemplateId } from "features/forms/types";
import { toFormFields, toFormItems } from "features/forms/utils";
import { ObjectVisibility, renderActions } from "features/render";
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
    const dispatchFormsGlobals = useDispatchFormsGlobals();
    const lazyFormsGlobals = useLazyFormsGlobals();

    const willUnmount = useRef(false);
    const [items, setItems] = useState<FItype[]>([]);
    const [isUpdated, setIsUpdated] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { data: form, isLoading: isFormLoading } = useGetLocationFormQuery({
        projectId: sceneId,
        templateId,
        formId,
    });

    useEffect(() => {
        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));
        dispatch(formsActions.setSelectedFormId(formId));
        dispatchFormsGlobals(formsGlobalsActions.setTransformDraft(undefined));
    }, [dispatch, formId, dispatchFormsGlobals]);

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
        if (form?.location) {
            dispatchFormsGlobals(
                formsGlobalsActions.setTransformDraft({
                    location: form.location,
                    rotation: form.rotation,
                    scale: form.scale,
                    updated: false,
                })
            );
        }
    }, [form, dispatchFormsGlobals]);

    useEffect(() => {
        willUnmount.current = false;
        return () => {
            willUnmount.current = true;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (willUnmount.current) {
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
                    }
                    updateForm({
                        projectId: sceneId,
                        templateId,
                        formId,
                        form,
                    });
                }

                dispatchFormsGlobals(formsGlobalsActions.setTransformDraft(undefined));
            }
        };
    }, [sceneId, templateId, formId, isUpdated, items, title, updateForm, lazyFormsGlobals, dispatchFormsGlobals]);

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
                        <Button color="grey" onClick={handleClearClick}>
                            <Clear sx={{ mr: 1 }} />
                            Clear
                        </Button>
                        <Button color="grey" onClick={() => setIsDeleting(true)}>
                            <Delete fontSize="small" sx={{ mr: 1 }} />
                            Delete
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
                <TransformEditor />
            </ScrollBox>
        </>
    );
}
