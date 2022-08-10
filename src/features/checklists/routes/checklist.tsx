import { ArrowBack, Circle, Layers } from "@mui/icons-material";
import { Box, Button, List, ListItemButton, ListItemIcon, ListItemText, Typography, useTheme } from "@mui/material";
import { useHistory, useParams } from "react-router-dom";

import { Divider, ScrollBox } from "components";
import { useAppDispatch, useAppSelector } from "app/store";

import { selectChecklistById, selectInstanceByChecklistId } from "../checklistsSlice";
import { useDispatchVisible, visibleActions } from "contexts/visible";
import { ObjectVisibility, renderActions } from "slices/renderSlice";
import { customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";

export function Checklist() {
    const { id } = useParams<{ id: string }>();
    const theme = useTheme();
    const history = useHistory();
    const checklist = useAppSelector((state) => selectChecklistById(state, id));
    const instances = useAppSelector((state) => selectInstanceByChecklistId(state, id));
    const dispatchVisible = useDispatchVisible();
    const dispatchHighlighted = useDispatchHighlighted();
    const { dispatch: dispatchGroups } = useCustomGroups();
    const dispatch = useAppDispatch();

    const handleShowObjects = () => {
        // todo special group R/Y/G colors?

        dispatchHighlighted(highlightActions.setIds([]));
        dispatchVisible(visibleActions.set(instances.map((instance) => instance.objectId)));
        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));
        dispatchGroups(customGroupsActions.reset());
    };

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
                        <Button color="grey" onClick={handleShowObjects}>
                            <Layers sx={{ mr: 1 }} />
                            Show objects
                        </Button>
                    </Box>
                </>
            </Box>
            <ScrollBox pt={2} pb={3}>
                <Typography px={1} fontWeight={600} mb={1}>
                    {checklist?.title}
                </Typography>
                <List dense disablePadding>
                    {instances.map((instance) => {
                        const completedItems = instance.items.filter((item) => item.value).length;

                        return (
                            <ListItemButton
                                sx={{ px: 1 }}
                                key={instance.id}
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
                                            completedItems === 0
                                                ? "red"
                                                : completedItems === instance.items.length
                                                ? "green"
                                                : "orange"
                                        }
                                        fontSize="inherit"
                                    />
                                </ListItemIcon>
                                <ListItemText>{instance.name}</ListItemText>
                            </ListItemButton>
                        );
                    })}
                </List>
            </ScrollBox>
        </>
    );
}
