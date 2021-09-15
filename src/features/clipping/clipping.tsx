import { Switch, Box, FormControlLabel } from "@material-ui/core";
import { useAppDispatch, useAppSelector } from "app/store";

import { renderActions, selectClippingPlanes } from "slices/renderSlice";

const axisNames = ["-X", "-Y", "-Z", "+X", "+Y", "+Z"];

export function Clipping() {
    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const { defining, enabled, showBox, inside } = clippingPlanes;
    const dispatch = useAppDispatch();

    const toggle = (func: "enabled" | "showBox" | "inside") => () => {
        return dispatch(renderActions.setClippingPlanes({ ...clippingPlanes, [func]: !clippingPlanes[func] }));
    };

    const toggleDefineNew = () => {
        if (clippingPlanes.defining) {
            return dispatch(renderActions.setClippingPlanes({ ...clippingPlanes, defining: false }));
        }

        dispatch(renderActions.setClippingPlanes({ ...clippingPlanes, enabled: true, showBox: true, defining: true }));
    };

    return (
        <Box p={1}>
            <Box mt={1} mb={2} display="flex" flexDirection="column">
                <FormControlLabel
                    control={<Switch size="medium" color="primary" checked={enabled} onChange={toggle("enabled")} />}
                    label={<Box ml={0.5}>Enable clipping</Box>}
                />
                <FormControlLabel
                    control={<Switch size="medium" color="primary" checked={showBox} onChange={toggle("showBox")} />}
                    label={
                        <Box ml={0.5}>
                            Show clipping box{" "}
                            {showBox && clippingPlanes.highlight !== -1
                                ? `(${axisNames[clippingPlanes.highlight]})`
                                : ""}
                        </Box>
                    }
                />
                <FormControlLabel
                    control={<Switch size="medium" color="primary" checked={inside} onChange={toggle("inside")} />}
                    label={<Box ml={0.5}>Clip inside box</Box>}
                />
                <Box mt={2}>
                    <FormControlLabel
                        control={<Switch size="medium" color="primary" checked={defining} onChange={toggleDefineNew} />}
                        label={<Box ml={0.5}>Define new box</Box>}
                    />
                </Box>
            </Box>
        </Box>
    );
}
