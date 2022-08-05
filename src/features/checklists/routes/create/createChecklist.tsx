import { FormEventHandler, useState } from "react";
import { CancelOutlined } from "@mui/icons-material";
import { Box, Button, IconButton, List, Typography, useTheme } from "@mui/material";
import { useHistory, useRouteMatch } from "react-router-dom";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";

import { Divider, LinearProgress, ScrollBox, TextField } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncState, AsyncStatus } from "types/misc";
import { useAbortController } from "hooks/useAbortController";
import { batchedPropertySearch } from "utils/search";
import { getObjectNameFromPath } from "utils/objectData";
import { useAppDispatch } from "app/store";

import { ChecklistInstance, ChecklistItem } from "../../types";
import { addChecklist, addChecklistInstances } from "../../utils";
import { checklistsActions } from "../../checklistsSlice";
import { ChecklistItemType } from "../../types";

export function CreateChecklist({
    title,
    setTitle,
    items,
    setItems,
    objects,
}: {
    title: string;
    setTitle: React.Dispatch<React.SetStateAction<string>>;
    items: ChecklistItem[];
    setItems: React.Dispatch<React.SetStateAction<ChecklistItem[]>>;
    objects: { searchPattern: SearchPattern[]; ids: ObjectId[] } | undefined;
}) {
    const theme = useTheme();
    const history = useHistory();
    const match = useRouteMatch();
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const dispatch = useAppDispatch();

    const [{ status }, setStatus] = useState<AsyncState<null>>({ status: AsyncStatus.Initial });
    const [abortController] = useAbortController();

    const canSave = title && items.length && objects;

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();

        if (!canSave) {
            return;
        }

        setStatus({ status: AsyncStatus.Loading });

        try {
            const abortSignal = abortController.current.signal;
            const objectDataList = await batchedPropertySearch({
                scene,
                abortSignal,
                property: "id",
                value: objects.ids.map((id) => String(id)),
            });

            const [checklist, checklists] = addChecklist({
                title,
                items,
                instances: { searchPattern: objects.searchPattern, count: objects.ids.length, completed: 0 },
            });

            const instances: Omit<ChecklistInstance, "id">[] = objectDataList.map((obj) => ({
                checklistId: checklist.id,
                items: checklist.items.map((item) => ({ id: item.id, value: null })),
                name: getObjectNameFromPath(obj.path),
                objectId: obj.id,
                position: obj.bounds?.sphere.center,
            }));

            dispatch(checklistsActions.setChecklists(checklists));
            dispatch(checklistsActions.setChecklistInstances(addChecklistInstances(instances)));
            setStatus({ status: AsyncStatus.Success });
            history.goBack();
        } catch (e) {
            setStatus({ status: AsyncStatus.Error, msg: "Checklist creation failed" });
            return;
        }
    };

    return (
        <>
            {status === AsyncStatus.Loading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox p={1} pt={2} pb={3} component={"form"} onSubmit={handleSubmit}>
                <Typography fontWeight={600} mb={1}>
                    Checklist
                </Typography>
                <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
                <Divider sx={{ my: 1 }} />
                <Box display={"flex"} justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={600}>Objects assigned: {objects?.ids.length}</Typography>
                    <Button onClick={() => history.push(match.path + "/add-objects")}>Add objects</Button>
                </Box>
                <Divider />
                <Box display={"flex"} justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={600}>Items:</Typography>
                    <Button onClick={() => history.push(match.path + "/add-item")}>Add item</Button>
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
                                <IconButton
                                    onClick={() => setItems((state) => state.filter((_item) => _item !== item))}
                                >
                                    <CancelOutlined fontSize="small" />
                                </IconButton>
                            </Box>
                        ))}
                    </List>
                ) : null}
                <Box display="flex" justifyContent="space-between" mt={2}>
                    <Button variant="outlined" color="grey" sx={{ mr: 2 }} fullWidth onClick={() => history.goBack()}>
                        Cancel
                    </Button>
                    <Button variant="contained" color="primary" fullWidth disabled={!canSave} type="submit">
                        Save checklist
                    </Button>
                </Box>
            </ScrollBox>
        </>
    );
}

function getChecklistItemTypeDisplayName(type: ChecklistItemType): string {
    switch (type) {
        case ChecklistItemType.YesNo:
            return "Yes / No";
        case ChecklistItemType.TrafficLight:
            return "Traffic light";
        case ChecklistItemType.Checkbox:
        case ChecklistItemType.Dropdown:
        case ChecklistItemType.Text:
            return type[0].toUpperCase() + type.slice(1);
    }
}
