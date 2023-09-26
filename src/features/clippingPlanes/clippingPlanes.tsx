import { DeleteSweep, SyncAlt } from "@mui/icons-material";
import { Box, Button, FormControlLabel, Slider } from "@mui/material";
import { vec4 } from "gl-matrix";
import { SyntheticEvent, useCallback, useEffect, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    IosSwitch,
    LogoSpeedDial,
    ScrollBox,
    WidgetContainer,
    WidgetHeader,
} from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { Picker, renderActions, selectClippingPlanes, selectPicker } from "features/render/renderSlice";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorerSlice";
import { getFilePathFromObjectPath } from "utils/objectData";
import { ClippedFile, ClippedObject } from "./clippedObject";
import { VecRGB } from "utils/color";
import { iterateAsync } from "utils/search";

export default function ClippingPlanes() {
    const {
        state: { view, db },
    } = useExplorerGlobals(true);
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.clippingPlanes.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.clippingPlanes.key);
    const selecting = useAppSelector(selectPicker) === Picker.ClippingPlane;
    const { planes } = useAppSelector(selectClippingPlanes);
    const dispatch = useAppDispatch();
    const [sliders, setSliders] = useState([] as number[]);
    const isInitial = useRef(true);

    const [clippedFiles, setClippedFiles] = useState([] as ClippedFile[]);

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
            setSliders(planes.map((plane) => -plane.normalOffset[3]));
        }
    }, [planes]);

    const handleSliderChange = (idx: number) => (_event: Event, newValue: number | number[]) => {
        const selected = planes[idx];

        if (!selected) {
            return;
        }

        const plane = vec4.clone(selected.normalOffset);

        const newVal = typeof newValue === "number" ? newValue : newValue[0];
        plane[3] = -newVal;

        setSliders((_state) => {
            const state = [..._state];
            state[idx] = newVal;
            return state;
        });

        view.modifyRenderState({
            clipping: { planes: planes.map((p, i) => (i === idx ? { ...selected, normalOffset: plane } : p)) },
        });
    };

    const updateClippedFiles = useCallback(async () => {
        const getFileId = async (fileName: string) => {
            const iterator = db.search({ parentPath: fileName }, undefined);
            const [nodes] = await iterateAsync({ iterator, count: 100000 });
            const ids: number[] = [];
            for (const node of nodes) {
                ids.push(node.id);
            }
            return ids;
        };

        const objIds = await view.getOutlineObjectsOnScreen();
        if (objIds) {
            const filePaths = new Set<string>();
            for (const obj of objIds) {
                const data = await db.getObjectMetdata(obj);
                const f = getFilePathFromObjectPath(data.path);
                if (f) {
                    filePaths.add(f);
                }
            }
            const files: ClippedFile[] = [];

            function hsl2rgb(h: number, s: number, l: number) {
                let a = s * Math.min(l, 1 - l);
                let f = (n: number, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                console.log(h, s, l);
                return [f(0), f(8), f(4)];
            }
            let i = 0;
            const increments = 360 / filePaths.size;
            for (const f of filePaths) {
                const ids = await getFileId(f);
                files.push({ name: f, color: hsl2rgb(increments * i, 1, 0.5) as VecRGB, hidden: false, ids });
                ++i;
            }
            view.modifyRenderState({
                highlights: {
                    groups: files.map((f) => {
                        return {
                            objectIds: f.ids,
                            outlineColor: f.color,
                        };
                    }),
                },
            });
            setClippedFiles(files);
        }
    }, [view, db]);

    // useEffect(() => {
    //     renderFnRef.current = updateClippedObjects;
    //     return () => (renderFnRef.current = undefined);
    //     function updateClippedObjects(moved: boolean, idleFrame: boolean) {
    //         if (view && idleFrame && planes.length > 0) {
    //             updateClippedFiles();
    //         }
    //     }
    // }, [view, renderFnRef, planes, updateClippedFiles]);

    const handleSliderChangeCommitted =
        (idx: number) => (_event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
            const selected = planes[idx];

            if (!selected) {
                return;
            }

            const plane = vec4.clone(selected.normalOffset);
            const newVal = typeof newValue === "number" ? newValue : newValue[0];
            plane[3] = -newVal;

            dispatch(
                renderActions.setClippingPlanes({
                    planes: planes.map((p, i) => (i === idx ? { ...selected, normalOffset: plane } : p)),
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
                                        min={-plane.baseW - 20}
                                        max={-plane.baseW + 20}
                                        step={0.1}
                                        value={sliders[idx]}
                                        onChange={handleSliderChange(idx)}
                                        onChangeCommitted={handleSliderChangeCommitted(idx)}
                                    />
                                </Box>
                            );
                        })}

                    <Accordion>
                        <AccordionSummary>Clipped objects</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" alignItems="start" flexDirection="column">
                                <Button onClick={() => updateClippedFiles()} color="grey">
                                    <SyncAlt sx={{ mr: 1 }} />
                                    Update
                                </Button>

                                {clippedFiles.map((f, idx) => {
                                    return <ClippedObject file={f} key={idx} />;
                                })}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.clippingPlanes.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
