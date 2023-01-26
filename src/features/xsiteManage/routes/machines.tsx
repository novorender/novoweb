import { useHistory } from "react-router-dom";
import { Box, List, ListItemButton, useTheme } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { LinearProgress, ScrollBox } from "components";

import { useGetMachinesQuery } from "../api";
import { selectXsiteManageSite, xsiteManageActions } from "../slice";

export function Machines() {
    const theme = useTheme();
    const history = useHistory();
    const dispatch = useAppDispatch();

    const site = useAppSelector(selectXsiteManageSite);
    const {
        data: machines,
        isFetching: isFetchingMachines,
        isError: machinesError,
    } = useGetMachinesQuery(site?.siteId ?? "", { skip: !site });

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
            {isFetchingMachines && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox p={1} pb={3}>
                {machinesError && "An error occurred while loading machines."}
                {machines?.length === 0 ? (
                    "No machines found."
                ) : (
                    <List disablePadding sx={{ mx: -1 }}>
                        {machines?.map((machine) => (
                            <ListItemButton
                                sx={{ px: 1 }}
                                disableGutters
                                key={machine.machineId}
                                onClick={() => {
                                    history.push(`/machine/${machine.machineId}`);
                                    dispatch(
                                        xsiteManageActions.activateLogPoints({
                                            machine: machine.machineId,
                                        })
                                    );
                                }}
                            >
                                {machine.name}
                            </ListItemButton>
                        ))}
                    </List>
                )}
            </ScrollBox>
        </>
    );
}
