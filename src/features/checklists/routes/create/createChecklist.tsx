import { CancelOutlined } from "@mui/icons-material";
import { Box, Button, IconButton, List, Typography, useTheme } from "@mui/material";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { FormEventHandler, useCallback, useMemo, useState } from "react";
import { useHistory, useRouteMatch } from "react-router-dom";

import { Divider, LinearProgress, ScrollBox, TextField } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAbortController } from "hooks/useAbortController";
import { useSceneId } from "hooks/useSceneId";
import { AsyncState, AsyncStatus } from "types/misc";

import { useCreateFormMutation } from "../../api";
import { ChecklistItem } from "../../types";
import { getChecklistItemTypeDisplayName, idsToObjects, toFormFields } from "../../utils";

export function CreateChecklist({
    title,
    setTitle,
    items,
    setItems,
    objects: checklistObjects,
}: {
    title: string;
    setTitle: (title: string) => void;
    items: ChecklistItem[];
    setItems: (items: ChecklistItem[]) => void;
    objects?: { searchPattern: string | SearchPattern[]; ids: ObjectId[] };
}) {
    const theme = useTheme();
    const history = useHistory();
    const match = useRouteMatch();
    const {
        state: { db },
    } = useExplorerGlobals(true);

    const sceneId = useSceneId();
    const [createForm, { isLoading: creatingForm }] = useCreateFormMutation();

    const [{ status }, setStatus] = useState<AsyncState<null>>({
        status: AsyncStatus.Initial,
    });

    const [abortController] = useAbortController();

    const canSave = useMemo(() => title && items.length && checklistObjects?.ids, [title, items, checklistObjects]);

    const handleAddItem = useCallback(() => {
        history.push(`${match.path}/add-item`);
    }, [history, match.path]);

    const handleTitleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setTitle(e.target.value);
        },
        [setTitle]
    );

    const handleAddObjects = useCallback(() => {
        history.push(`${match.path}/add-objects`);
    }, [history, match.path]);

    const handleRemoveItem = useCallback(
        (id?: string) => {
            setItems(items.filter((item) => item.id !== id));
        },
        [items, setItems]
    );

    const handleSubmit: FormEventHandler = useCallback(
        async (e) => {
            e.preventDefault();

            if (!canSave) {
                return;
            }

            setStatus({ status: AsyncStatus.Loading });

            try {
                const abortSignal = abortController.current.signal;

                const objects = await idsToObjects({
                    ids: checklistObjects!.ids,
                    db,
                    abortSignal,
                });

                const fields = toFormFields(items);

                const template = {
                    title,
                    fields,
                    objects,
                };

                await createForm({ projectId: sceneId, template });

                setStatus({ status: AsyncStatus.Success, data: null });
                history.goBack();
            } catch (e) {
                setStatus({
                    status: AsyncStatus.Error,
                    msg: "Checklist creation failed",
                });
                return;
            }
        },
        [abortController, canSave, checklistObjects, createForm, db, history, items, sceneId, title]
    );

    return (
        <>
            {status === AsyncStatus.Loading || creatingForm ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox p={1} pt={2} pb={3} component={"form"} onSubmit={handleSubmit}>
                <Typography fontWeight={600} mb={1}>
                    Checklist
                </Typography>
                <TextField label="Title" value={title} onChange={handleTitleChange} fullWidth />
                <Divider sx={{ my: 1 }} />
                <Box display={"flex"} justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={600}>Objects assigned: {checklistObjects?.ids.length}</Typography>
                    <Button onClick={handleAddObjects}>Add objects</Button>
                </Box>
                <Divider />
                <Box display={"flex"} justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={600}>Items:</Typography>
                    <Button onClick={handleAddItem}>Add item</Button>
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
                                        {getChecklistItemTypeDisplayName(item.type)}
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
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        disabled={!canSave || status === AsyncStatus.Loading || creatingForm}
                        type="submit"
                    >
                        Save checklist
                    </Button>
                </Box>
            </ScrollBox>
        </>
    );
}
