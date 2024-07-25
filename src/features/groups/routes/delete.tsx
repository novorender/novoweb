import { Box, useTheme } from "@mui/material";
import { useHistory, useParams } from "react-router-dom";

import { useDeleteObjectGroupMutation } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation } from "components";
import { objectGroupsActions, useDispatchObjectGroups } from "contexts/objectGroups";
import { useSceneId } from "hooks/useSceneId";
import { AsyncStatus } from "types/misc";

import { groupsActions, selectSaveStatus } from "../groupsSlice";

export function Delete() {
    const theme = useTheme();
    const history = useHistory();
    const projectId = useSceneId();
    const id = useParams<{ id?: string }>().id;
    const dispatchObjectGroups = useDispatchObjectGroups();
    const saveStatus = useAppSelector(selectSaveStatus);
    const dispatch = useAppDispatch();
    const [deleteGroup] = useDeleteObjectGroupMutation();

    if (!id) {
        history.goBack();
        return <></>;
    }

    const handleDeleteGroup = async () => {
        try {
            dispatch(groupsActions.setSaveStatus({ status: AsyncStatus.Loading }));
            await deleteGroup({ projectId, groupId: id }).unwrap();
            dispatch(groupsActions.setSaveStatus({ status: AsyncStatus.Success, data: "Group deleted successfully" }));

            dispatchObjectGroups(objectGroupsActions.delete(id));
        } catch (error) {
            console.error(error);
            dispatch(groupsActions.setSaveStatus({ status: AsyncStatus.Error, msg: "Error deleting group" }));
        }

        history.goBack();
    };

    const isSaving = saveStatus.status === AsyncStatus.Loading;

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
            <Confirmation
                title="Delete group?"
                confirmBtnText="Delete"
                onCancel={() => {
                    history.goBack();
                }}
                onConfirm={handleDeleteGroup}
                loading={isSaving}
            />
        </>
    );
}
