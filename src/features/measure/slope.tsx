import { ListItem, Grid } from "@mui/material";
import { vec3, vec2 } from "gl-matrix";

const epsilon = 1e-4;

export function Slope({ start, end }: { start: vec3; end: vec3 }) {
    const sub = vec3.sub(vec3.create(), start, end);
    const dir = vec3.normalize(vec3.create(), sub);

    const horizontal = Math.abs(dir[2]) < epsilon;
    const vertical = Math.abs(Math.abs(dir[2]) - 1) < epsilon;
    const planarVec = vec2.fromValues(sub[0], sub[1]);

    return (
        <ListItem>
            <Grid container>
                <Grid item xs={4}>
                    Slope
                </Grid>
                <Grid item xs={6}>
                    {vertical
                        ? "Vertical"
                        : horizontal
                        ? "Horitzontal"
                        : `${(Math.abs(sub[2] / vec2.len(planarVec)) * 100).toFixed(2)} %`}
                </Grid>
            </Grid>
        </ListItem>
    );
}
