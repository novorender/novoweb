import { useHistory, useParams } from "react-router-dom";
import { Box, Button, CircularProgress, Typography, useTheme } from "@mui/material";
import { ArrowBack, LocationOnOutlined } from "@mui/icons-material";

import { LinearProgress, ScrollBox, Divider, Accordion, AccordionSummary, AccordionDetails } from "components";
import { useAllUnitsQuery, useEquipmentQuery } from "../leicaApi";
import { useAppSelector } from "app/store";
import { selectProjectId } from "../leicaSlice";
import { selectProjectSettings } from "slices/renderSlice";

export function Unit() {
    const theme = useTheme();
    const history = useHistory();
    const { id } = useParams<{ id?: string }>();
    const projectId = useAppSelector(selectProjectId);
    const { tmZone } = useAppSelector(selectProjectSettings);

    const { unit, isLoading, isError } = useAllUnitsQuery(projectId, {
        pollingInterval: 20 * 1000,
        selectFromResult: ({ data, isLoading, isError }) => ({
            isLoading,
            isError,
            unit: id ? data?.find((_unit) => _unit.uuid === id) : undefined,
        }),
    });

    return isLoading ? (
        <LinearProgress />
    ) : (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex">
                        <Button onClick={() => history.goBack()} color="grey">
                            <ArrowBack sx={{ mr: 1 }} />
                            Back
                        </Button>
                        {unit?.location ? (
                            <Button disabled={!tmZone} onClick={() => {}} color="grey">
                                <LocationOnOutlined sx={{ mr: 1 }} />
                                Go to
                            </Button>
                        ) : null}
                    </Box>
                </>
            </Box>
            <ScrollBox p={1} pt={2} pb={2}>
                {isError || !unit ? (
                    <Typography>Failed to load data from Leica.</Typography>
                ) : (
                    <>
                        <Box mb={1}>
                            {unit.name}
                            <br />
                            {unit.metadata.type_label}
                        </Box>

                        <Box sx={{ mx: -1 }}>
                            <EquipmentList unitId={unit.uuid} />
                        </Box>
                    </>
                )}
            </ScrollBox>
        </>
    );
}

function EquipmentList({ unitId }: { unitId: string }) {
    const { equipment, isLoading, isError } = useEquipmentQuery(unitId!, {
        selectFromResult: ({ data, isLoading, isError }) => ({
            isLoading,
            isError,
            equipment: data,
        }),
        skip: !unitId,
    });

    return (
        <Accordion defaultExpanded>
            <AccordionSummary>Equipment</AccordionSummary>
            <AccordionDetails sx={{ p: 1 }}>
                {isLoading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height={50}>
                        <CircularProgress />
                    </Box>
                ) : isError ? (
                    "Failed to load equipment for this unit."
                ) : !equipment?.length ? (
                    "No equipment found for this unit."
                ) : (
                    equipment.map((eq) => <Box key={eq.uuid}>{eq.equipment.type_label}</Box>)
                )}
            </AccordionDetails>
        </Accordion>
    );
}
