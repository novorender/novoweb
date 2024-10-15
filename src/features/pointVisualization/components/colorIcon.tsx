import { ColorLens } from "@mui/icons-material";
import { SvgIconProps, useTheme } from "@mui/material";

import { VecRGB, VecRGBA, vecToRgb } from "utils/color";

export default function ColorIcon({ iconColor, ...props }: { iconColor: VecRGB | VecRGBA } & SvgIconProps) {
    const theme = useTheme();
    const { r, g, b, a: _a } = vecToRgb(iconColor);
    const a = _a ?? 1;

    const needsStroke = (r > 230 && g > 230 && b > 230) || a < 0.2;

    return (
        <ColorLens
            sx={{
                color: `rgba(${r}, ${g}, ${b}, ${a})`,
                stroke: needsStroke ? theme.palette.grey[400] : undefined,
            }}
            {...props}
        />
    );
}
