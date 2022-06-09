import { useState } from "react";
import { ChromePicker, ColorChangeHandler } from "react-color";
import { Box, Popover, PopoverProps } from "@mui/material";

import { VecRGB, VecRGBA, vecToRgb } from "utils/color";

type Props = Omit<PopoverProps, "color"> & {
    color: VecRGB | VecRGBA;
    onChangeComplete: ColorChangeHandler;
};

export function ColorPicker({ color, onChangeComplete, ...popoverProps }: Props) {
    const [{ r, g, b, a }, setPickerColor] = useState(vecToRgb(color));

    return (
        <Popover {...popoverProps}>
            <Box display="inline-flex" alignItems="center">
                <ChromePicker
                    color={{ r, g, b, a }}
                    onChange={({ rgb }) => setPickerColor({ ...rgb, a: rgb.a ?? 1 })}
                    onChangeComplete={onChangeComplete}
                />
            </Box>
        </Popover>
    );
}
