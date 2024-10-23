import { Grid } from "@mui/material";
import { ReadonlyVec3, vec2, vec3 } from "gl-matrix";
import { useTranslation } from "react-i18next";

export const epsilon = 1e-3;

export function Slope({ start, end }: { start: ReadonlyVec3; end: ReadonlyVec3 }) {
    const { t } = useTranslation();

    const sub = vec3.sub(vec3.create(), start, end);
    const dir = vec3.normalize(vec3.create(), sub);

    const horizontal = Math.abs(dir[2]) < epsilon;
    const vertical = Math.abs(Math.abs(dir[2]) - 1) < epsilon;
    const planarVec = vec2.fromValues(sub[0], sub[1]);

    return (
        <Grid container>
            <Grid item xs={5}>
                {t("slope")}
            </Grid>
            <Grid item xs={5}>
                {vertical
                    ? "Vertical"
                    : horizontal
                      ? "Horizontal"
                      : `${(Math.abs(sub[2] / vec2.len(planarVec)) * 100).toFixed(2)} %`}
            </Grid>
        </Grid>
    );
}
