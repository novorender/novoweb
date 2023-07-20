import { ArrowBack } from "@mui/icons-material";
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    FormControl,
    FormHelperText,
    FormLabel,
    InputLabel,
    MenuItem,
    OutlinedInput,
    Select,
    Typography,
    useTheme,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, LinearProgress, ScrollBox, TextField } from "components";
import { featuresConfig } from "config/features";

import { uniqueArray } from "utils/misc";
import { useGetAllLogPointsQuery, useGetMachinesQuery } from "../api";
import {
    LogPointTime,
    selectXsiteManageActiveLogPoints,
    selectXsiteManageAvailableLogPointCodes,
    selectXsiteManageCurrentMachine,
    selectXsiteManageIncludedLogPointCodes,
    selectXsiteManageSite,
    xsiteManageActions,
} from "../slice";
import { toDBSN } from "../utils";

export function Machine() {
    const theme = useTheme();
    const history = useHistory();
    const { id } = useParams<{ id?: string }>();
    const site = useAppSelector(selectXsiteManageSite);
    const activeLogPoints = useAppSelector(selectXsiteManageActiveLogPoints);
    const currentMachine = useAppSelector(selectXsiteManageCurrentMachine);
    const dispatch = useAppDispatch();
    const [logPointCount, setLogPointCount] = useState({
        [LogPointTime.Day]: -1,
        [LogPointTime.Week]: -1,
        [LogPointTime.Month]: -1,
        [LogPointTime.All]: -1,
    });
    const availableLogPointCodes = useAppSelector(selectXsiteManageAvailableLogPointCodes);
    const includedLogPointCodes = useAppSelector(selectXsiteManageIncludedLogPointCodes);

    const {
        machine,
        isFetching: isFetchingMachine,
        isError: isMachineError,
    } = useGetMachinesQuery(site?.siteId ?? "", {
        skip: !site?.siteId,
        selectFromResult: ({ data, isFetching, isError }) => ({
            isFetching,
            isError,
            machine: id ? data?.find((_machine) => _machine.machineId === id) : undefined,
        }),
    });

    const { data: logPointData, isFetching: isFetchingLogPoints } = useGetAllLogPointsQuery(site?.siteId ?? "", {
        skip: !site?.siteId || !id,
    });

    useEffect(() => {
        if (logPointData) {
            const daysToMs = (d: number) => d * 24 * 60 * 60 * 1000;
            const now = Date.now();
            const all = logPointData.filter((lpt) => lpt.machineId === id);
            const month = all.filter((lpt) => lpt.machineId === id && lpt.timestampMs >= now - daysToMs(30));
            const week = month.filter((lpt) => lpt.timestampMs >= now - daysToMs(7));
            const day = week.filter((lpt) => lpt.timestampMs >= now - daysToMs(1));

            setLogPointCount({
                [LogPointTime.Day]: day.length,
                [LogPointTime.Week]: week.length,
                [LogPointTime.Month]: month.length,
                [LogPointTime.All]: all.length,
            });

            if (!availableLogPointCodes) {
                dispatch(
                    xsiteManageActions.setAvailableLogPointCodes(
                        uniqueArray(logPointData.filter((lpt) => lpt.code).map((lpt) => lpt.code!)).sort((a, b) =>
                            a.localeCompare(b, undefined, { numeric: true })
                        )
                    )
                );
            }
        }
    }, [logPointData, id, dispatch, availableLogPointCodes]);

    return isFetchingMachine ? (
        <Box position="relative">
            <LinearProgress />
        </Box>
    ) : (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <Button onClick={() => history.push("/machines")} color="grey">
                            <ArrowBack sx={{ mr: 1 }} />
                            Back
                        </Button>
                    </Box>
                </>
            </Box>
            {isFetchingLogPoints && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox p={1} pt={2} pb={2}>
                {isMachineError || !machine ? (
                    <Typography>Failed to load machine data from {featuresConfig.xsiteManage.name}.</Typography>
                ) : (
                    <>
                        <Typography fontWeight={"bold"} mb={1}>
                            {machine.name}
                        </Typography>
                        <Typography color="secondary" mb={1}>
                            DBSN: {toDBSN(machine.machineId)}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Box display="flex" flexDirection={"column"}>
                            <InputLabel id="xsite-log-points-since" sx={{ color: "text.primary", fontWeight: 600 }}>
                                Show log points
                            </InputLabel>
                            <Select
                                labelId="xsite-log-points-since"
                                sx={{ minWidth: 150, mb: 2 }}
                                disabled={isFetchingLogPoints}
                                name="log-points"
                                size="small"
                                value={activeLogPoints && currentMachine === id ? activeLogPoints : LogPointTime.None}
                                onChange={(e) =>
                                    dispatch(
                                        xsiteManageActions.activateLogPoints({
                                            time: e.target.value as LogPointTime,
                                            machine: id ?? "",
                                        })
                                    )
                                }
                                input={<OutlinedInput />}
                            >
                                <MenuItem value={LogPointTime.None}>None</MenuItem>
                                <MenuItem value={LogPointTime.Day}>
                                    Last 24 hours{" "}
                                    {logPointCount[LogPointTime.Day] >= 0 && <>({logPointCount[LogPointTime.Day]})</>}{" "}
                                </MenuItem>
                                <MenuItem value={LogPointTime.Week}>
                                    Last 7 days{" "}
                                    {logPointCount[LogPointTime.Week] >= 0 && <>({logPointCount[LogPointTime.Week]})</>}{" "}
                                </MenuItem>
                                <MenuItem value={LogPointTime.Month}>
                                    Last 30 days{" "}
                                    {logPointCount[LogPointTime.Month] >= 0 && (
                                        <>({logPointCount[LogPointTime.Month]})</>
                                    )}{" "}
                                </MenuItem>
                                <MenuItem value={LogPointTime.All}>
                                    All{" "}
                                    {logPointCount[LogPointTime.All] >= 0 && <>({logPointCount[LogPointTime.All]})</>}{" "}
                                </MenuItem>
                            </Select>
                            <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 2 }}>
                                <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                    <FormLabel
                                        sx={{ fontWeight: 600, color: "text.primary" }}
                                        htmlFor={"xiste-logpoint-code-filter"}
                                    >
                                        Filter by codes
                                    </FormLabel>
                                </Box>
                                <Autocomplete
                                    id="xiste-logpoint-code-filter"
                                    fullWidth
                                    multiple={true}
                                    disableCloseOnSelect
                                    size="small"
                                    loadingText={"Loading log points..."}
                                    loading={isFetchingLogPoints}
                                    options={availableLogPointCodes ?? []}
                                    value={includedLogPointCodes}
                                    onChange={(_e, value) =>
                                        dispatch(xsiteManageActions.setIncludedLogPointCodes(value))
                                    }
                                    renderOption={(props, option, { selected }) => (
                                        <li {...props}>
                                            <Checkbox style={{ marginRight: 8 }} checked={selected} />
                                            {option}
                                        </li>
                                    )}
                                    renderInput={(params) => <TextField variant="outlined" {...params} />}
                                />
                                <FormHelperText>Include all if no codes are selected.</FormHelperText>
                            </FormControl>
                        </Box>
                    </>
                )}
            </ScrollBox>
        </>
    );
}
