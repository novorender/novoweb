import { Box, useTheme } from "@mui/material";
import { t } from "i18next";
import { useHistory, useLocation } from "react-router-dom";

import { useAppDispatch } from "app/redux-store-interactions";
import { Confirmation } from "components";
import { objectGroupsActions, useDispatchObjectGroups } from "contexts/objectGroups";

import { groupsActions } from "../groupsSlice";

export function Delete() {
    const theme = useTheme();
    const history = useHistory();
    const ids = (useLocation().state as { ids: string[] })?.ids;
    const dispatchObjectGroups = useDispatchObjectGroups();
    const dispatch = useAppDispatch();

    if (!ids || ids.length === 0) {
        history.goBack();
        return <></>;
    }

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
            <Confirmation
                title={t("deleteGroupQuestion", { count: ids.length })}
                confirmBtnText="Delete"
                onCancel={() => {
                    history.goBack();
                }}
                onConfirm={() => {
                    dispatchObjectGroups(objectGroupsActions.delete(ids));
                    dispatch(groupsActions.setEditingGroups(false));
                    dispatch(groupsActions.setGroupsSelectedForEdit([]));
                    history.goBack();
                }}
            />
        </>
    );
}
