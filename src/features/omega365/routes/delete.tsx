import { Box, useTheme } from "@mui/material";
import { FormEvent } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation } from "components";

import { selectOmega365ConfigDraft } from "../selectors";
import { omega365Actions } from "../slice";

export default function Delete() {
    const theme = useTheme();
    const history = useHistory();
    const config = useAppSelector(selectOmega365ConfigDraft);
    const viewId = useParams<{ id?: string }>().id;
    const dispatch = useAppDispatch();

    if (!viewId) {
        history.push("/config");
        return;
    }

    const handleDelete = async (e: FormEvent) => {
        e.preventDefault();

        if (!config) {
            return;
        }

        dispatch(
            omega365Actions.setConfigDraft({
                ...config,
                views: config.views.filter((v) => v.id !== viewId),
            })
        );
        history.push("/config");
    };

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
            <Confirmation
                title="Delete view?"
                confirmBtnText="Delete"
                onCancel={() => history.goBack()}
                component="form"
                onSubmit={handleDelete}
            />
        </>
    );
}
