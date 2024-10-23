import { CancelOutlined } from "@mui/icons-material";
import {
    Box,
    Button,
    FormControl,
    FormControlLabel,
    IconButton,
    List,
    Radio,
    RadioGroup,
    Typography,
    useTheme,
} from "@mui/material";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { skipToken } from "@reduxjs/toolkit/query";
import { FormEventHandler, useCallback, useMemo, useState } from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useRouteMatch } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox, TextField } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useCreateSearchFormMutation, useGetTemplateQuery, useUpdateTemplateMutation } from "features/forms/api";
import { formsActions, selectAssets } from "features/forms/slice";
import {
    type FormItem,
    type FormObject,
    type SearchTemplate,
    type Template,
    type TemplateId,
    TemplateType,
} from "features/forms/types";
import { getFormItemTypeDisplayName, idsToObjects, toFormFields } from "features/forms/utils";
import { useAbortController } from "hooks/useAbortController";
import { useSceneId } from "hooks/useSceneId";
import { AsyncState, AsyncStatus } from "types/misc";

interface CreateFormProps {
    title: string;
    setTitle: (title: string) => void;
    type: TemplateType;
    setType: (type: TemplateType) => void;
    items: FormItem[];
    setItems: (items: FormItem[]) => void;
    objects?: { searchPattern: string | SearchPattern[]; ids: ObjectId[] };
    marker: string | undefined;
    templateId?: TemplateId;
}

export function CreateForm({
    title,
    setTitle,
    type,
    setType,
    items,
    setItems,
    objects,
    marker,
    templateId,
}: CreateFormProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const match = useRouteMatch();
    const {
        state: { db },
    } = useExplorerGlobals(true);
    const dispatch = useAppDispatch();

    const projectId = useSceneId();
    const [createForm, { isLoading: creatingForm }] = useCreateSearchFormMutation();
    const [updateTemplate, { isLoading: updatingTemplate }] = useUpdateTemplateMutation();

    const { data: existingTemplate, isLoading: isTemplateLoading } = useGetTemplateQuery(
        templateId ? { projectId, templateId } : skipToken,
    );

    const [{ status }, setStatus] = useState<AsyncState<null>>({
        status: AsyncStatus.Initial,
    });

    const [abortController] = useAbortController();
    const abortSignal = abortController.current.signal;

    const [formObjects, setFormObjects] = useState<FormObject[] | null>(null);
    const [isFetchingFormObjects, setIsFetchingFormObjects] = useState(false);

    const canSave = useMemo(
        () =>
            Boolean(
                title.trim() &&
                    items.length &&
                    (type === TemplateType.Location ? marker : !isFetchingFormObjects && formObjects?.length),
            ),
        [title, type, items, marker, formObjects, isFetchingFormObjects],
    );

    const handleAddItem = useCallback(() => {
        history.push(`${match.path}/add-item`);
    }, [history, match.path]);

    const handleTypeChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => setType((e.target as HTMLInputElement).value as TemplateType),
        [setType],
    );

    const handleTitleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setTitle(e.target.value);
        },
        [setTitle],
    );

    const handleAddObjects = useCallback(() => {
        history.push(`${match.path}/add-objects`);
    }, [history, match.path]);

    const handleSelectMarker = useCallback(() => {
        history.push(`${match.path}/select-marker`);
    }, [history, match.path]);

    const handleRemoveItem = useCallback(
        (id?: string) => {
            setItems(items.filter((item) => item.id !== id));
        },
        [items, setItems],
    );

    const fetchObjects = useCallback(async () => {
        if (objects?.ids) {
            setIsFetchingFormObjects(true);
            try {
                const formObjects = await idsToObjects({
                    ids: objects.ids,
                    db,
                    abortSignal,
                });
                if (formObjects.length) {
                    setFormObjects(formObjects);
                    setIsFetchingFormObjects(false);
                }
            } catch {
                // nada
            }
        }
    }, [abortSignal, db, objects]);

    const handleSubmit: FormEventHandler = useCallback(
        async (e) => {
            e.preventDefault();

            if (!canSave) {
                return;
            }

            setStatus({ status: AsyncStatus.Loading });

            try {
                const fields = toFormFields(items);

                const template: Partial<Template> = {
                    title: title.trim(),
                    type: type as TemplateType.Search | TemplateType.Location,
                    fields,
                };

                if (template.type === TemplateType.Search && formObjects) {
                    template.objects = formObjects;
                    template.searchPattern = templateId
                        ? (existingTemplate as SearchTemplate).searchPattern
                        : JSON.stringify(objects?.searchPattern);
                } else if (template.type === TemplateType.Location) {
                    template.marker = marker!;
                }

                if (templateId) {
                    await updateTemplate({ projectId, templateId, template });
                    dispatch(formsActions.templateLoaded({ id: templateId, ...template }));
                } else {
                    const templateId = await createForm({ projectId, template }).unwrap();
                    dispatch(formsActions.templateLoaded({ id: templateId, ...template }));
                }

                setStatus({ status: AsyncStatus.Success, data: null });
                history.goBack();
            } catch {
                setStatus({
                    status: AsyncStatus.Error,
                    msg: templateId ? t("formUpdateFailed") : t("formCreationFailed"),
                });
                return;
            }
        },
        [
            canSave,
            items,
            title,
            type,
            formObjects,
            templateId,
            history,
            existingTemplate,
            objects?.searchPattern,
            marker,
            updateTemplate,
            projectId,
            dispatch,
            createForm,
            t,
        ],
    );

    useEffect(() => {
        if (existingTemplate?.type === TemplateType.Search) {
            setFormObjects(existingTemplate.objects);
        }
    }, [existingTemplate]);

    useEffect(() => {
        if (objects?.ids) {
            fetchObjects();
        }
    }, [objects, fetchObjects]);

    return (
        <>
            {isTemplateLoading ||
            status === AsyncStatus.Loading ||
            creatingForm ||
            updatingTemplate ||
            isFetchingFormObjects ||
            isTemplateLoading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox p={1} pt={2} pb={3} component="form" onSubmit={handleSubmit}>
                <Typography fontWeight={600} mb={1}>
                    {t("form")}
                </Typography>
                <TextField label="Title" value={title} onChange={handleTitleChange} fullWidth />
                <Typography fontWeight={600} mt={1}>
                    {t("formType")}
                </Typography>
                <FormControl disabled={Boolean(templateId)}>
                    <RadioGroup row value={type} onChange={handleTypeChange}>
                        <FormControlLabel value={TemplateType.Search} control={<Radio />} label={t("object")} />
                        <FormControlLabel value={TemplateType.Location} control={<Radio />} label={t("geo")} />
                    </RadioGroup>
                </FormControl>

                {type === TemplateType.Search && (
                    <>
                        <Divider sx={{ my: 1 }} />
                        <Box my={1} display="flex" justifyContent="space-between" alignItems="center">
                            <Typography fontWeight={600}>
                                {t("objectsAssigned", {
                                    length: templateId ? formObjects?.length : objects?.ids.length,
                                })}
                            </Typography>
                            <Button onClick={handleAddObjects} disabled={Boolean(templateId)}>
                                {t("addObjects")}
                            </Button>
                        </Box>
                    </>
                )}

                {type === TemplateType.Location && (
                    <>
                        <Divider sx={{ my: 1 }} />
                        <Box my={1} display="flex" alignItems="center">
                            <Typography fontWeight={600}>{t("markerName")}</Typography>
                            <Box flex="auto" />
                            {marker && (
                                <Box mr={1}>
                                    <MarkerLabel marker={marker} />
                                </Box>
                            )}
                            <Button onClick={handleSelectMarker}>{t("selectMarker")}</Button>
                        </Box>
                    </>
                )}

                <Divider />
                <Box my={1} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={600}>{t("items")}</Typography>
                    <Button onClick={handleAddItem}>{t("addItem")}</Button>
                </Box>
                {items.length ? (
                    <List dense disablePadding>
                        {items.map((item, idx) => (
                            <Box component="li" key={idx} display="flex" width={1} mb={1}>
                                <Box
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    width={1}
                                    px={1}
                                    py={0.5}
                                    border={`1px solid ${theme.palette.grey[300]}`}
                                    borderRadius={"4px"}
                                >
                                    <Typography>{item.title}</Typography>
                                    <Button color="grey" size="small">
                                        {getFormItemTypeDisplayName(item.type)}
                                    </Button>
                                </Box>
                                <IconButton onClick={() => handleRemoveItem(item.id)}>
                                    <CancelOutlined fontSize="small" />
                                </IconButton>
                            </Box>
                        ))}
                    </List>
                ) : null}
                <Box display="flex" justifyContent="space-between" mt={2}>
                    <Button variant="outlined" color="grey" sx={{ mr: 1 }} fullWidth onClick={history.goBack}>
                        {t("cancel")}
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        disabled={
                            !canSave ||
                            status === AsyncStatus.Loading ||
                            creatingForm ||
                            isTemplateLoading ||
                            updatingTemplate
                        }
                        type="submit"
                    >
                        {t("saveForm")}
                    </Button>
                </Box>
            </ScrollBox>
        </>
    );
}

function MarkerLabel({ marker }: { marker: string }) {
    const { t } = useTranslation();
    const assets = useAppSelector(selectAssets);

    if (assets.status !== AsyncStatus.Success) {
        return null;
    }

    const asset = assets.data.find((a) => a.name === marker);
    if (!asset) {
        return <>[{t("unknown")}]</>;
    }

    return <>{asset.label}</>;
}
