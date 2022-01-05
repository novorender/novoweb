import type { ReadonlyVec3, ReadonlyVec4, vec3, vec4 } from "gl-matrix";
import { useState } from "react";
import { ChromePicker, ColorChangeHandler } from "react-color";
import { Box, Portal, ClickAwayListener } from "@mui/material";

import { vecToRgb, vecToRgba } from "utils/color";

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

type PropsA = {
    testId?: string;
    position?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
    color: vec4 | ReadonlyVec4;
    onChangeComplete: ColorChangeHandler;
    onOutsideClick: () => void;
};

export function ColorPickerA({ testId, position = {}, color, onChangeComplete, onOutsideClick }: PropsA) {
    const [{ r, g, b, a }, setPickerColor] = useState(() => {
        const [r, g, b, a] = vecToRgba(color);
        return { r, g, b, a };
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
                        color={{ r, g, b, a }}
                        onChange={({ rgb }) => setPickerColor({ ...rgb, a: rgb.a ?? 1 })}
                        onChangeComplete={onChangeComplete}
                    />
                </Box>
            </ClickAwayListener>
        </Portal>
    );
}
