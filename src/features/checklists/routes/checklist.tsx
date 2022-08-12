import { ArrowBack, Circle } from "@mui/icons-material";
import { Box, Button, List, ListItemButton, ListItemIcon, ListItemText, Typography, useTheme } from "@mui/material";
import { useHistory, useParams } from "react-router-dom";

import { Divider, ScrollBox } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { useDispatchVisible, visibleActions } from "contexts/visible";
import { ObjectVisibility, renderActions } from "slices/renderSlice";
import { customGroupsActions, InternalGroup, useDispatchCustomGroups } from "contexts/customGroups";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";

import { selectChecklistById, selectInstanceByChecklistId } from "../checklistsSlice";
import { getRequiredItems } from "../utils";
import { useEffect } from "react";

enum Status {
    Initial,
    InProgress,
    Done,
}

export function Checklist() {
    const { id } = useParams<{ id: string }>();
    const theme = useTheme();
    const history = useHistory();
    const checklist = useAppSelector((state) => selectChecklistById(state, id));
    const requiredItems = checklist ? getRequiredItems(checklist) : [];
    const instances = useAppSelector((state) => selectInstanceByChecklistId(state, id)).map((instance) => {
        const completedItems = instance.items.filter((item) => item.value && item.value[0]).length;

        return {
            ...instance,
            status:
                completedItems === 0
                    ? Status.Initial
                    : completedItems === requiredItems.length
                    ? Status.Done
                    : Status.InProgress,
        };
    });
    const dispatchVisible = useDispatchVisible();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchGroups = useDispatchCustomGroups();
    const dispatch = useAppDispatch();

    // const handleShowObjects = () => {
    //     dispatchHighlighted(highlightActions.setIds([]));
    //     dispatchVisible(visibleActions.set(instances.map((instance) => instance.objectId)));
    //     dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));

    //     dispatchGroups(customGroupsActions.reset());
    //     // todo open checklist - set main object

    //     const red = instances
    //         .filter((instance) => instance.status === Status.Initial)
    //         .map((instance) => instance.objectId);

    //     const orange = instances
    //         .filter((instance) => instance.status === Status.InProgress)
    //         .map((instance) => instance.objectId);

    //     const green = instances
    //         .filter((instance) => instance.status === Status.Done)
    //         .map((instance) => instance.objectId);

    //     dispatchGroups(
    //         customGroupsActions.update(InternalGroup.Checklist + "_RED", { ids: red, selected: true, hidden: false })
    //     );
    //     dispatchGroups(
    //         customGroupsActions.update(InternalGroup.Checklist + "_ORANGE", {
    //             ids: orange,
    //             selected: true,
    //             hidden: false,
    //         })
    //     );
    //     dispatchGroups(
    //         customGroupsActions.update(InternalGroup.Checklist + "_GREEN", {
    //             ids: green,
    //             selected: true,
    //             hidden: false,
    //         })
    //     );
    // };

    useEffect(() => {
        dispatchHighlighted(highlightActions.setIds([]));
        dispatchVisible(visibleActions.set(instances.map((instance) => instance.objectId)));
        dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));

        dispatchGroups(customGroupsActions.reset());
        // todo open checklist - set main object

        const red = instances
            .filter((instance) => instance.status === Status.Initial)
            .map((instance) => instance.objectId);

        const orange = instances
            .filter((instance) => instance.status === Status.InProgress)
            .map((instance) => instance.objectId);

        const green = instances
            .filter((instance) => instance.status === Status.Done)
            .map((instance) => instance.objectId);

        dispatchGroups(
            customGroupsActions.update(InternalGroup.Checklist + "_RED", { ids: red, selected: true, hidden: false })
        );
        dispatchGroups(
            customGroupsActions.update(InternalGroup.Checklist + "_ORANGE", {
                ids: orange,
                selected: true,
                hidden: false,
            })
        );
        dispatchGroups(
            customGroupsActions.update(InternalGroup.Checklist + "_GREEN", {
                ids: green,
                selected: true,
                hidden: false,
            })
        );
    }, [dispatch, dispatchHighlighted, dispatchGroups, dispatchVisible, instances]);

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
                        {/* <Button color="grey" onClick={handleShowObjects}>
                            <Layers sx={{ mr: 1 }} />
                            Show objects
                        </Button> */}
                    </Box>
                </>
            </Box>
            <ScrollBox pt={2} pb={3}>
                <Typography px={1} fontWeight={600} mb={1}>
                    {checklist?.title}
                </Typography>
                <List dense disablePadding>
                    {instances.map((instance) => {
                        return (
                            <ListItemButton
                                sx={{ px: 1 }}
                                key={instance.id}
                                onClick={() => history.push(`/instance/${instance.id}`)}
                                onMouseEnter={() => {
                                    dispatchGroups(
                                        customGroupsActions.update(InternalGroup.Checklist + "_CUSTOM_HIGHLIGHT", {
                                            ids: [instance.objectId],
                                            selected: true,
                                            hidden: false,
                                        })
                                    );
                                }}
                                onMouseLeave={() => {
                                    dispatchGroups(
                                        customGroupsActions.update(InternalGroup.Checklist + "_CUSTOM_HIGHLIGHT", {
                                            selected: false,
                                            hidden: false,
                                        })
                                    );
                                }}
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
                                            instance.status === Status.Initial
                                                ? "red"
                                                : instance.status === Status.Done
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
