import { ListItem, Grid } from "@mui/material";
import { vec3, vec2 } from "gl-matrix";

export function PlanarDiff({ start, end }: { start: vec3; end: vec3 }) {
    const diff = vec3.sub(vec3.create(), start, end);
    const planarDiff = vec2.len(vec2.fromValues(diff[0], diff[2]));

    return (
        <ListItem>
            <Grid container>
                <Grid item xs={4}>
                    Planar dist.
                </Grid>
                <Grid item xs={6}>
                    {planarDiff.toFixed(3)} m
                </Grid>
            </Grid>
        </ListItem>
    );
}
