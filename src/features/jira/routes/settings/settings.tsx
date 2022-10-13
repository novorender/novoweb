import { Autocomplete, Box, useTheme } from "@mui/material";
import { Redirect, useRouteMatch } from "react-router-dom";

import { useAppSelector } from "app/store";
import { AsyncStatus } from "types/misc";

import { selectAvailableJiraSpaces } from "../../jiraSlice";
import { FormEventHandler, useState } from "react";
import { ScrollBox, TextField } from "components";
import { LoadingButton } from "@mui/lab";

export function Settings() {
    const match = useRouteMatch();
    const theme = useTheme();

    const availableSpaces = useAppSelector(selectAvailableJiraSpaces);
    const [space, setSpace] = useState(
        availableSpaces.status === AsyncStatus.Success ? availableSpaces.data[0] : undefined
    );

    if (availableSpaces.status !== AsyncStatus.Success) {
        return <Redirect to="/" />;
    }

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
    };

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
            <ScrollBox p={1} component="form" onSubmit={handleSubmit}>
                <Autocomplete
                    sx={{ mb: 3 }}
                    id="jiraSpace"
                    fullWidth
                    autoSelect
                    options={availableSpaces.data}
                    getOptionLabel={(opt) => opt.name}
                    value={space}
                    onChange={(_e, value) => {
                        if (!value) {
                            return;
                        }

                        setSpace(value);
                    }}
                    size="small"
                    includeInputInList
                    renderInput={(params) => <TextField required {...params} label="Space" />}
                />

                <LoadingButton>asdas</LoadingButton>
            </ScrollBox>
        </>
    );
}
