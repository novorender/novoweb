import { Box, Button, FormControlLabel, Slider } from "@mui/material";
import { SyntheticEvent, useEffect, useRef, useState } from "react";
import { vec4 } from "gl-matrix";
import { DeleteSweep } from "@mui/icons-material";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { Picker, renderActions, selectClippingPlanes, selectPicker } from "features/render/renderSlice";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

export default function ClippingPlanes() {
    const {
        state: { view_OLD: view },
    } = useExplorerGlobals(true);
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.clippingPlanes.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.clippingPlanes.key);
    const selecting = useAppSelector(selectPicker) === Picker.ClippingPlane;
    const { planes } = useAppSelector(selectClippingPlanes);
    const dispatch = useAppDispatch();
    const [sliders, setSliders] = useState([] as number[]);
    const isInitial = useRef(true);

    useEffect(() => {
        if (isInitial.current) {
            if (!selecting) {
                dispatch(renderActions.setPicker(Picker.ClippingPlane));
            }

            isInitial.current = false;
        }
    }, [dispatch, selecting]);

    useEffect(() => {
        return () => {
            dispatch(renderActions.stopPicker(Picker.ClippingPlane));
        };
    }, [dispatch]);

    useEffect(() => {
        if (planes.length) {
            setSliders(planes.map((plane) => plane.plane[3]));
        }
    }, [planes]);

    const handleSliderChange = (idx: number) => (_event: Event, newValue: number | number[]) => {
        const plane = planes[idx] ? vec4.clone(planes[idx].plane) : undefined;

        if (!plane) {
            return;
        }

        const newVal = typeof newValue === "number" ? newValue : newValue[0];
        plane[3] = typeof newValue === "number" ? newValue : newValue[0];

        setSliders((_state) => {
            const state = [..._state];
            state[idx] = newVal;
            return state;
        });

        view.applySettings({
            clippingVolume: {
                ...view.settings.clippingVolume,
                planes: planes.map((p, i) => (i === idx ? plane : p.plane)),
            },
        });
    };

    const handleSliderChangeCommitted =
        (idx: number) => (_event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
            const plane = planes[idx] ? (vec4.clone(planes[idx].plane) as Vec4) : undefined;

            if (!plane) {
                return;
            }

            const newVal = typeof newValue === "number" ? newValue : newValue[0];
            plane[3] = newVal;

            dispatch(
                renderActions.setClippingPlanes({
                    planes: planes.map((p, i) => (i === idx ? { ...planes[idx], plane } : p)),
                })
            );
        };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.clippingPlanes} disableShadow={menuOpen}>
                    {!menuOpen && !minimized ? (
                        <>
                            <Box mt={1} mb={1} display="flex" justifyContent="space-between">
                                <FormControlLabel
                                    sx={{ marginLeft: 0 }}
                                    control={
                                        <IosSwitch
                                            disabled={planes.length > 5}
                                            checked={selecting}
                                            color="primary"
                                            onChange={() =>
                                                dispatch(
                                                    renderActions.setPicker(
                                                        selecting ? Picker.Object : Picker.ClippingPlane
                                                    )
                                                )
                                            }
                                        />
                                    }
                                    labelPlacement="start"
                                    label={<Box>Select</Box>}
                                />
                                <Button
                                    onClick={() => {
                                        dispatch(renderActions.setClippingPlanes({ planes: [], enabled: false }));
                                    }}
                                    color="grey"
                                    disabled={!planes.length}
                                >
                                    <DeleteSweep sx={{ mr: 1 }} />
                                    Clear
                                </Button>
                            </Box>
                        </>
                    ) : null}
                </WidgetHeader>
                <ScrollBox p={1} pb={3} display={menuOpen || minimized ? "none" : "block"}>
                    {planes.length === sliders.length &&
                        planes.map((plane, idx) => {
                            return (
                                <Box mb={2} key={idx}>
                                    Plane {idx + 1}:
                                    <Slider
                                        min={plane.baseW - 20}
                                        step={0.1}
                                        max={plane.baseW + 20}
                                        value={sliders[idx]}
                                        onChange={handleSliderChange(idx)}
                                        onChangeCommitted={handleSliderChangeCommitted(idx)}
                                    />
                                </Box>
                            );
                        })}
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.clippingPlanes.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
