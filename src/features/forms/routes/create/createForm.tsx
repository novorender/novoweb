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
import { FormEventHandler, useCallback, useMemo, useState } from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useRouteMatch } from "react-router-dom";

import { useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox, TextField } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectAssets } from "features/forms/slice";
import { useAbortController } from "hooks/useAbortController";
import { useSceneId } from "hooks/useSceneId";
import { AsyncState, AsyncStatus } from "types/misc";

import { useCreateSearchFormMutation } from "../../api";
import { type FormItem, type FormObject, type Template, TemplateType } from "../../types";
import { getFormItemTypeDisplayName, idsToObjects, toFormFields } from "../../utils";

export function CreateForm({
    title,
    setTitle,
    type,
    setType,
    items,
    setItems,
    objects,
    marker,
}: {
    title: string;
    setTitle: (title: string) => void;
    type: TemplateType;
    setType: (type: TemplateType) => void;
    items: FormItem[];
    setItems: (items: FormItem[]) => void;
    objects?: { searchPattern: string | SearchPattern[]; ids: ObjectId[] };
    marker: string | undefined;
}) {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const match = useRouteMatch();
    const {
        state: { db },
    } = useExplorerGlobals(true);

    const sceneId = useSceneId();
    const [createForm, { isLoading: creatingForm }] = useCreateSearchFormMutation();

    const [{ status }, setStatus] = useState<AsyncState<null>>({
        status: AsyncStatus.Initial,
    });

    const [abortController] = useAbortController();
    const abortSignal = abortController.current.signal;

    const [formObjects, setFormObjects] = useState<FormObject[] | null>(null);
    const [isFetchingFormObjects, setIsFetchingFormObjects] = useState(false);

    const canSave = useMemo(
        () =>
            title.trim() &&
            items.length &&
            (type === TemplateType.Location ? marker : !isFetchingFormObjects && formObjects?.length),
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
                    template.searchPattern = JSON.stringify(objects?.searchPattern);
                } else if (template.type === TemplateType.Location) {
                    template.marker = marker!;
                }

                await createForm({ projectId: sceneId, template });

                setStatus({ status: AsyncStatus.Success, data: null });
                history.goBack();
            } catch {
                setStatus({
                    status: AsyncStatus.Error,
                    msg: "Form creation failed",
                });
                return;
            }
        },
        [canSave, formObjects, createForm, history, items, sceneId, title, type, marker, objects],
    );

    useEffect(() => {
        if (objects?.ids) {
            fetchObjects();
        }
    }, [objects, fetchObjects]);

    return (
        <>
            {status === AsyncStatus.Loading || creatingForm || isFetchingFormObjects ? (
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
                <FormControl>
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
                                {t("objectsAssigned", { length: objects?.ids.length })}
                            </Typography>
                            <Button onClick={handleAddObjects}>{t("addObjects")}</Button>
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
                        disabled={!canSave || status === AsyncStatus.Loading || creatingForm}
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
