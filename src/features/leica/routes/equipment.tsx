import { Box, Typography, useTheme } from "@mui/material";

import { useAppSelector } from "app/store";
import { LinearProgress, ScrollBox } from "components";

import { useAllUnitsQuery } from "../leicaApi";
import { selectProjectId } from "../leicaSlice";

// TODO(List equipment)

export function Equipment() {
    const theme = useTheme();
    const projectId = useAppSelector(selectProjectId);
    const { data: units, isLoading, isError } = useAllUnitsQuery(projectId);

    return isLoading ? (
        <LinearProgress />
    ) : (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader} sx={{ height: 5, width: 1 }} position="absolute" />
            <ScrollBox p={1} pt={2}>
                {isError ? (
                    <Typography>Failed to load data from Leica.</Typography>
                ) : !units?.length ? (
                    <Typography>No equipment found.</Typography>
                ) : (
                    <>
                        {units.map((unit) => (
                            <Box key={unit.uuid}>{unit.name}</Box>
                        ))}
                    </>
                )}
            </ScrollBox>
        </>
    );
}
