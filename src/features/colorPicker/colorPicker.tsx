import { Box, Popover, PopoverProps } from "@mui/material";
import { useEffect, useState } from "react";
import { ChromePicker, ColorChangeHandler } from "react-color";

import { VecRGB, VecRGBA, vecToRgb } from "utils/color";

type Props = Omit<PopoverProps, "color"> & {
    color: VecRGB | VecRGBA;
    onChangeComplete: ColorChangeHandler;
    disableAlpha?: boolean;
};

export function ColorPicker({ color, onChangeComplete, disableAlpha, ...popoverProps }: Props) {
    const [{ r, g, b, a }, setPickerColor] = useState(vecToRgb(color));

    useEffect(() => {
        setPickerColor(vecToRgb(color));
    }, [color]);

    return (
        <Popover {...popoverProps}>
            <Box display="inline-flex" alignItems="center">
                <ChromePicker
                    color={{ r, g, b, a }}
                    onChange={({ rgb }) => setPickerColor({ ...rgb, a: rgb.a ?? 1 })}
                    onChangeComplete={onChangeComplete}
                    disableAlpha={disableAlpha}
                />
            </Box>
        </Popover>
    );
}
