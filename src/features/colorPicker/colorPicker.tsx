import type { ReadonlyVec3, vec3 } from "gl-matrix";
import { useState } from "react";
import { ChromePicker, ColorChangeHandler } from "react-color";
import { Box, Portal, ClickAwayListener } from "@mui/material";

import { vecToRgb } from "utils/color";

type Props = {
    testId?: string;
    position?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
    color: vec3 | ReadonlyVec3;
    onChangeComplete: ColorChangeHandler;
    onOutsideClick: () => void;
};

export function ColorPicker({ testId, position = {}, color, onChangeComplete, onOutsideClick }: Props) {
    const [{ r, g, b }, setPickerColor] = useState(() => {
        const [r, g, b] = vecToRgb(color);
        return { r, g, b };
    });

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
                        color={{ r, g, b }}
                        disableAlpha
                        onChange={({ rgb }) => setPickerColor(rgb)}
                        onChangeComplete={onChangeComplete}
                    />
                </Box>
            </ClickAwayListener>
        </Portal>
    );
}
