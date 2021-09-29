import { Box, Button, FormControlLabel, useTheme } from "@material-ui/core";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch } from "components/iosSwitch";
import { renderActions, selectMeasure } from "slices/renderSlice";

import DeleteSweepIcon from "@material-ui/icons/DeleteSweep";
import { vec3 } from "gl-matrix";
import { TextField } from "components";

export function Measure() {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const measure = useAppSelector(selectMeasure);
    let { addingPoint, points, distance, distances, angles } = measure;

    const toggleAddPoint = () => {
        dispatch(renderActions.setMeasure({ ...measure, addingPoint: !addingPoint }));
    };

    const removeLastPoint = () => {
        const num = distances.length;
        if (num > 0) {
            distance -= distances[num - 1];
            distances = distances.slice(0, -1);
        }
        if (num > 1) {
            angles = angles.slice(0, -1);
        }
        points = points.slice(0, -1);
        dispatch(renderActions.setMeasure({ ...measure, points, distances, angles, distance }));
    };

    const v0 = points[0];
    const v1 = points[1];
    const delta = v0 && v1 ? vec3.sub(vec3.create(), v1, v0) : undefined;

    return (
        <>
            <Box p={1} boxShadow={theme.customShadows.widgetHeader} display="flex" justifyContent="space-between">
                <FormControlLabel
                    control={
                        <IosSwitch size="medium" color="primary" checked={addingPoint} onChange={toggleAddPoint} />
                    }
                    label={<Box fontSize={14}>Add point</Box>}
                />
                <Button onClick={removeLastPoint} disabled={points.length < 1}>
                    <DeleteSweepIcon />
                    <Box ml={1}>Remove last point</Box>
                </Button>
            </Box>
            {points.length > 0 && points.length < 3 && (
                <>
                    <Box display="flex" alignItems="center" ml={1} mb={1}>
                        <Box mr={1}>
                            <TextField label="Start (m) X" variant="outlined" fullWidth value={v0[0].toFixed(3)} />
                        </Box>
                        <Box mr={1}>
                            <TextField label="Y" variant="outlined" fullWidth value={(-v0[2]).toFixed(3)} />
                        </Box>
                        <Box mr={1}>
                            <TextField label="Z" variant="outlined" fullWidth value={v0[1].toFixed(3)} />
                        </Box>
                    </Box>
                    {v1 !== undefined && (
                        <Box display="flex" alignItems="center" ml={1} mb={1}>
                            <Box mr={1}>
                                <TextField label="End (m) X" variant="outlined" fullWidth value={v1[0].toFixed(3)} />
                            </Box>
                            <Box mr={1}>
                                <TextField label="Y" variant="outlined" fullWidth value={(-v1[2]).toFixed(3)} />
                            </Box>
                            <Box mr={1}>
                                <TextField label="Z" variant="outlined" fullWidth value={v1[1].toFixed(3)} />
                            </Box>
                        </Box>
                    )}
                    {delta !== undefined && (
                        <Box display="flex" alignItems="center" ml={1} mb={1}>
                            <Box mr={1}>
                                <TextField
                                    label="Delta (m) X"
                                    variant="outlined"
                                    fullWidth
                                    value={Math.abs(delta[0]).toFixed(3)}
                                />
                            </Box>
                            <Box mr={1}>
                                <TextField
                                    label="Y"
                                    variant="outlined"
                                    fullWidth
                                    value={Math.abs(delta[2]).toFixed(3)}
                                />
                            </Box>
                            <Box mr={1}>
                                <TextField
                                    label="Z"
                                    variant="outlined"
                                    fullWidth
                                    value={Math.abs(delta[1]).toFixed(3)}
                                />
                            </Box>
                        </Box>
                    )}
                </>
            )}
            {distance > 0 && (
                <Box display="flex" alignItems="center" ml={1} mr={1}>
                    <TextField
                        label={points.length > 2 ? "Total Distance (m)" : "Distance (m)"}
                        variant="outlined"
                        fullWidth
                        value={distance.toFixed(3)}
                    />
                </Box>
            )}
        </>
    );
}
