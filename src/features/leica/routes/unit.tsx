import { useHistory, useParams } from "react-router-dom";
import { Box, Button, CircularProgress, Typography, useTheme } from "@mui/material";
import { ArrowBack, LocationOnOutlined } from "@mui/icons-material";

import { LinearProgress, ScrollBox, Divider, Accordion, AccordionSummary, AccordionDetails } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { CameraType, renderActions, selectProjectSettings } from "slices/renderSlice";
import { dataApi } from "app";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { useAllUnitsQuery, useEquipmentQuery } from "../leicaApi";
import { selectProjectId } from "../leicaSlice";

export function Unit() {
    const theme = useTheme();
    const history = useHistory();
    const { id } = useParams<{ id?: string }>();
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const dispatch = useAppDispatch();
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

    const handleGoTo = () => {
        if (!unit?.location || !tmZone) {
            return;
        }

        const pos = dataApi.latLon2tm({ latitude: unit.location.lat, longitude: unit.location.lon }, tmZone);

        dispatch(
            renderActions.setCamera({
                type: CameraType.Flight,
                goTo: {
                    position: [pos[0], unit.location.altitude + 1, pos[2]],
                    rotation: view.camera.rotation,
                },
            })
        );
    };

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
                        <Button onClick={() => history.push("/units")} color="grey">
                            <ArrowBack sx={{ mr: 1 }} />
                            Back
                        </Button>
                        {unit?.location ? (
                            <Button disabled={!tmZone} onClick={handleGoTo} color="grey">
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
                            {unit.metadata.note ? (
                                <>
                                    {" "}
                                    <br />
                                    {unit.metadata.note}
                                </>
                            ) : null}
                            <br />
                            {unit.metadata.is_online ? "Online" : "Offline"}
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
    const { equipment, isFetching, isError } = useEquipmentQuery(unitId!, {
        selectFromResult: ({ data, isFetching, isError }) => ({
            isFetching,
            isError,
            equipment: data,
        }),
        skip: !unitId,
    });

    return (
        <Accordion defaultExpanded>
            <AccordionSummary>Equipment</AccordionSummary>
            <AccordionDetails sx={{ p: 1 }}>
                {isFetching ? (
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
