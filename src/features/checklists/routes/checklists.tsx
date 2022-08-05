import { AddCircle } from "@mui/icons-material";
import { Box, Button, List, ListItemButton, Typography, useTheme } from "@mui/material";
import { useHistory } from "react-router-dom";

import { Divider, ScrollBox } from "components";
import { useAppSelector } from "app/store";

import { selectChecklists } from "../checklistsSlice";

export function Checklists() {
    const theme = useTheme();
    const history = useHistory();
    const checklists = useAppSelector(selectChecklists);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex">
                        <Button color="grey" onClick={() => history.push("/create")}>
                            <AddCircle sx={{ mr: 1 }} />
                            Add checklist
                        </Button>
                    </Box>
                </>
            </Box>
            <ScrollBox py={2}>
                {checklists.length ? (
                    <List dense disablePadding>
                        {checklists.map((cl) => (
                            <ListItemButton
                                key={cl.id}
                                sx={{ justifyContent: "space-between" }}
                                onClick={() => history.push(`/checklist/${cl.id}`)}
                            >
                                <Typography mr={2}>{cl.title}</Typography>
                                <Typography>
                                    {cl.instances.completed} / {cl.instances.count}
                                </Typography>
                            </ListItemButton>
                        ))}{" "}
                    </List>
                ) : (
                    "No checklists"
                )}
            </ScrollBox>
        </>
    );
}
