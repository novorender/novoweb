import { ArrowBack, Circle } from "@mui/icons-material";
import { Box, Button, List, ListItemButton, ListItemIcon, ListItemText, Typography, useTheme } from "@mui/material";
import { Redirect, useHistory, useParams } from "react-router-dom";

import { Divider, ScrollBox } from "components";
import { useAppSelector } from "app/store";

import { selectChecklists, selectInstancesByObjectId } from "../checklistsSlice";
import { getRequiredItems } from "../utils";

enum Status {
    Initial,
    InProgress,
    Done,
}

export function Object() {
    const { id } = useParams<{ id: string }>();
    const theme = useTheme();
    const history = useHistory();
    const instances = useAppSelector((state) => selectInstancesByObjectId(state, Number(id)));
    const checklists = useAppSelector(selectChecklists);

    if (instances.length === 1) {
        return <Redirect push={false} to={`/instance/${instances[0].id}`} />;
    }

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex">
                        <Button color="grey" onClick={() => history.goBack()}>
                            <ArrowBack sx={{ mr: 1 }} />
                            Back
                        </Button>
                    </Box>
                </>
            </Box>
            <ScrollBox py={2}>
                {instances.length ? (
                    <List dense disablePadding>
                        {instances.map((instance) => {
                            const checklist = checklists.find((checklist) => instance.checklistId === checklist.id);

                            if (!checklist) {
                                return null;
                            }

                            const requiredItems = checklist ? getRequiredItems(checklist) : [];
                            const completedItems = instance.items.filter((item) => item.value && item.value[0]).length;
                            const status =
                                completedItems === 0
                                    ? Status.Initial
                                    : completedItems === requiredItems.length
                                    ? Status.Done
                                    : Status.InProgress;

                            return (
                                <ListItemButton
                                    key={instance.id}
                                    sx={{ justifyContent: "space-between" }}
                                    onClick={() => history.push(`/instance/${instance.id}`)}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 24,
                                            minHeight: 24,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 12,
                                            mr: 1,
                                        }}
                                    >
                                        <Circle
                                            htmlColor={
                                                status === Status.Initial
                                                    ? "red"
                                                    : status === Status.Done
                                                    ? "green"
                                                    : "orange"
                                            }
                                            fontSize="inherit"
                                        />
                                    </ListItemIcon>
                                    <ListItemText>{checklist.title}</ListItemText>
                                </ListItemButton>
                            );
                        })}
                    </List>
                ) : (
                    <Typography p={1}>No checklists attached to the selected object.</Typography>
                )}
            </ScrollBox>
        </>
    );
}
