import { Box, Button, FormControlLabel, useTheme } from "@material-ui/core";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch } from "components/iosSwitch";
import { renderActions, selectMeasure } from "slices/renderSlice";

import DeleteSweepIcon from "@material-ui/icons/DeleteSweep";

export function Measure() {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const measure = useAppSelector(selectMeasure);
    const { addingPoint } = measure;

    const toggleAddPoint = () => {
        dispatch(renderActions.setMeasure({ ...measure, addingPoint: !addingPoint }));
    };

    const removeLastPoint = () => {};

    return (
        <>
            <Box p={1} boxShadow={theme.customShadows.widgetHeader} display="flex" justifyContent="space-between">
                <FormControlLabel
                    control={
                        <IosSwitch size="medium" color="primary" checked={addingPoint} onChange={toggleAddPoint} />
                    }
                    label={<Box fontSize={14}>Add point(s)</Box>}
                />
                <Button onClick={removeLastPoint}>
                    <DeleteSweepIcon />
                    <Box ml={1}>Remove last point</Box>
                </Button>
            </Box>
            <Box p={1}>Point info</Box>
        </>
    );
}
