import { Grid } from "@mui/material";
import { ReadonlyVec3, vec2, vec3 } from "gl-matrix";
import { useTranslation } from "react-i18next";

export function PlanarDiff({ start, end }: { start: ReadonlyVec3; end: ReadonlyVec3 }) {
    const { t } = useTranslation();
    const diff = vec3.sub(vec3.create(), start, end);
    const planarDiff = vec2.len(vec2.fromValues(diff[0], diff[1]));

    return (
        <Grid container>
            <Grid item xs={5}>
                {t("planarDist")}
            </Grid>
            <Grid item xs={5}>
                {planarDiff.toFixed(3)} m
            </Grid>
        </Grid>
    );
}
