import { Box, FormControlLabel, IconButton, Radio, RadioGroup, Typography, useTheme, TextField } from "@mui/material";

import { renderActions, selectDeviation } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";

import { AddCircleOutline, BlurOn, DeleteForeverOutlined } from "@mui/icons-material";
import { vec4 } from "gl-matrix";
import { useToggle } from "hooks/useToggle";
import { ColorPickerA } from "features/colorPicker/colorPicker";
import { ColorResult } from "react-color";
import { RefCallback, useCallback, useState } from "react";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useMountedState } from "hooks/useMountedState";

export function Deviations() {
    const theme = useTheme();
    const deviation = useAppSelector(selectDeviation);
    const { mode, colors } = deviation;
    const dispatch = useAppDispatch();

    const {
        state: { scene },
    } = useExplorerGlobals(true);

    const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
    const [active, setActive] = useMountedState<number>(0);
    const containerRef = useCallback<RefCallback<HTMLDivElement>>((el) => {
        setContainerEl(el);
    }, []);

    const colorPickerPosition = getPickerPosition(containerEl);

    function change(event: React.ChangeEvent<HTMLInputElement>, value: string) {
        return dispatch(renderActions.setDeviation({ mode: value as "off" | "on" | "mix" }));
    }

    const subtrees = (scene as any).config.subtrees as string[] | undefined;
    const use = (subtrees?.indexOf("triangles") ?? -1) > -1 && (subtrees?.indexOf("points") ?? -1) > -1;
    return use ? (
        <Box p={1}>
            <Box
                mt={1}
                mb={1}
                display="flex"
                justifyContent="center"
                boxShadow={theme.customShadows.widgetHeader}
                ref={containerRef}
            >
                <RadioGroup
                    row
                    aria-label="gender"
                    name="row-radio-buttons-group"
                    value={mode}
                    onChange={change}
                    sx={{ marginBottom: theme.spacing(1) }}
                >
                    <FormControlLabel value="off" control={<Radio />} label="Off" />
                    <FormControlLabel value="on" control={<Radio />} label="On" />
                    <FormControlLabel value="mix" control={<Radio />} label="Mix" />
                </RadioGroup>
            </Box>
            {mode !== "off"
                ? colors
                      .map((c, i) => (
                          <ColorStop
                              key={active + "_" + i}
                              deviation={c.deviation}
                              color={c.color}
                              idx={i}
                              colorPickerPosition={colorPickerPosition}
                              active={active}
                              setActive={setActive}
                          />
                      ))
                      .reverse()
                : undefined}
        </Box>
    ) : (
        <Box p={1}>
            <Typography>No point clouds and triangles</Typography>
        </Box>
    );
}

type ColorStopProps = {
    deviation: number;
    color: vec4;
    idx: number;
    active: number;
    colorPickerPosition: { top: number; left: number } | undefined;
    setActive: (idx: number) => void;
};

function ColorStop({ deviation, color, idx, colorPickerPosition, active, setActive }: ColorStopProps) {
    const theme = useTheme();
    const [colorPicker, toggleColorPicker] = useToggle();
    const dev = useAppSelector(selectDeviation);
    const { colors } = dev;
    const dispatch = useAppDispatch();
    const change = useCallback(
        ({ rgb }: ColorResult) => {
            return dispatch(
                renderActions.setDeviation({
                    colors: colors.map((c, i) =>
                        i === idx ? { ...c, color: vec4.fromValues(rgb.r, rgb.g, rgb.b, rgb.a ?? 1) } : c
                    ),
                })
            );
        },
        [colors, idx, dispatch]
    );

    const changeValue = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = parseFloat(e.target.value);

            const newColors = colors
                .map((c, i) => ({ c: i === idx ? { ...c, deviation: val } : c, i }))
                .sort((a, b) => a.c.deviation - b.c.deviation);

            const newIdx = newColors.map((c, i) => ({ c, i })).filter((_) => _.c.i === idx)[0].i;

            dispatch(
                renderActions.setDeviation({
                    colors: newColors.map((c) => c.c),
                })
            );
            if (newIdx !== idx) {
                setActive(newIdx);
            }
        },
        [colors, idx, dispatch, setActive]
    );

    const remove = useCallback(() => {
        dispatch(
            renderActions.setDeviation({
                colors: colors.filter((c, i) => i !== idx),
            })
        );
        setActive(-1);
    }, [colors, idx, dispatch, setActive]);

    const add = useCallback(() => {
        const newColors = colors.map((c) => c);
        if (idx < 1) {
            newColors.splice(0, 0, { color: vec4.clone(colors[0].color), deviation: colors[0].deviation - 0.1 });
        } else {
            newColors.splice(idx, 0, {
                color: vec4.lerp(vec4.create(), colors[idx].color, colors[idx - 1].color, 0.5),
                deviation: (colors[idx].deviation + colors[idx - 1].deviation) * 0.5,
            });
        }
        dispatch(
            renderActions.setDeviation({
                colors: newColors,
            })
        );
        setActive(idx);
    }, [colors, idx, dispatch, setActive]);

    const focus = useCallback(() => setActive(idx), [idx, setActive]);

    const [r, g, b, a] = color as [r: number, g: number, b: number, a: number];
    return (
        <Box mt={1} mb={1} display="flex">
            <IconButton onClick={toggleColorPicker}>
                <BlurOn fontSize="large" sx={{ color: `rgba(${r * 255},${g * 255},${b * 255},${a})` }} />
            </IconButton>
            <TextField
                inputRef={active === idx ? (e) => e?.focus() : undefined}
                onFocus={focus}
                defaultValue={deviation}
                inputProps={{ type: "number", step: 0.1 }}
                variant="standard"
                onChange={changeValue}
                fullWidth
                sx={{ marginTop: theme.spacing(1) }}
            />
            <IconButton onClick={add}>
                <AddCircleOutline fontSize="small" />
            </IconButton>
            <IconButton onClick={remove}>
                <DeleteForeverOutlined fontSize="small" />
            </IconButton>
            {colorPicker ? (
                <ColorPickerA
                    position={colorPickerPosition}
                    color={color}
                    onChangeComplete={change}
                    onOutsideClick={toggleColorPicker}
                />
            ) : null}
        </Box>
    );
}

function getPickerPosition(el: HTMLElement | null) {
    if (!el) {
        return;
    }

    const { bottom, left } = el.getBoundingClientRect();
    return { top: bottom + 24, left: left + 24 }; // use picker width
}
