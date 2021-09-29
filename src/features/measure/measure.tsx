import { Switch, Box, FormControlLabel } from "@material-ui/core";

import { useAppDispatch, useAppSelector } from "app/store";
import { renderActions, selectMeasure } from "slices/renderSlice";

export function Measure() {
    const dispatch = useAppDispatch();
    const measure = useAppSelector(selectMeasure);
    const { addingPoint } = measure;

    const toggleAddPoint = () => {
        dispatch(renderActions.setMeasure({ ...measure, addingPoint: !addingPoint }));
    };

    return (
        <Box p={1}>
            <FormControlLabel
                control={<Switch size="medium" color="primary" checked={addingPoint} onChange={toggleAddPoint} />}
                label={<Box ml={0.5}>Add point</Box>}
            />
        </Box>
    );
}
