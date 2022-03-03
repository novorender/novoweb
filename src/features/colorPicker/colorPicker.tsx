import { useState } from "react";
import { ChromePicker, ColorChangeHandler } from "react-color";
import { Box, ClickAwayListener } from "@mui/material";
import { Portal } from "@mui/base";

import { VecRGB, VecRGBA, vecToRgb } from "utils/color";

type Props = {
    testId?: string;
    position?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
    color: VecRGB | VecRGBA;
    onChangeComplete: ColorChangeHandler;
    onOutsideClick: () => void;
};

export function ColorPicker({ testId, position = {}, color, onChangeComplete, onOutsideClick }: Props) {
    const [{ r, g, b, a }, setPickerColor] = useState(vecToRgb(color));

    return (
        <Portal>
            <ClickAwayListener onClickAway={onOutsideClick}>
                <Box
                    {...(testId ? { "data-test": testId } : {})}
                    position="absolute"
                    component="span"
                    display="flex"
                    alignItems="center"
                    {...position}
                >
                    <ChromePicker
                        color={{ r, g, b, a }}
                        onChange={({ rgb }) => setPickerColor({ ...rgb, a: rgb.a ?? 1 })}
                        onChangeComplete={onChangeComplete}
                    />
                </Box>
            </ClickAwayListener>
        </Portal>
    );
}
