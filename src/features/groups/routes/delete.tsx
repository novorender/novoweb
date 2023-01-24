import { useHistory, useParams } from "react-router-dom";
import { Box, useTheme } from "@mui/material";

import { Confirmation } from "components";
import { objectGroupsActions, useDispatchObjectGroups } from "contexts/objectGroups";

export function Delete() {
    const theme = useTheme();
    const history = useHistory();
    const id = useParams<{ id?: string }>().id;
    const dispatchObjectGroups = useDispatchObjectGroups();

    if (!id) {
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
                title="Delete group?"
                confirmBtnText="Delete"
                onCancel={() => {
                    history.goBack();
                }}
                onConfirm={() => {
                    dispatchObjectGroups(objectGroupsActions.delete(id));
                    history.goBack();
                }}
            />
        </>
    );
}
