import { ArrowDownward, DeleteSweep, SyncAlt } from "@mui/icons-material";
import { Box, Button, FormControlLabel, Switch } from "@mui/material";
import { ChangeEvent, useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
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
import Planes from "features/clippingPlanes/planes";
import {
    getTopDownParams,
    orthoCamActions,
    selectDefaultTopDownElevation,
    selectTopDownSnapToAxis,
} from "features/orthoCam";
import {
    CameraType,
    Picker,
    renderActions,
    selectCameraType,
    selectClippingPlanes,
    selectPicker,
} from "features/render";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";
import { hslToVec } from "utils/color";
import { getFilePathFromObjectPath } from "utils/objectData";
import { searchByPatterns } from "utils/search";

import { ClippedObject } from "./clippedObject";
import {
    clippingOutlineLaserActions,
    OutlineGroup,
    selectOutlineGroups,
    selectOutlineLasers,
} from "./outlineLaserSlice";

export default function ClippingOutline() {
    const {
        state: { view, db },
    } = useExplorerGlobals(true);
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.outlineLaser.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.outlineLaser.key);

    const { planes } = useAppSelector(selectClippingPlanes);
    const clippedFiles = useAppSelector(selectOutlineGroups);
    const dispatch = useAppDispatch();
    const picker = useAppSelector(selectPicker);
    const outlineLasers = useAppSelector(selectOutlineLasers);
    const cameraType = useAppSelector(selectCameraType);
    const defaultTopDownElevation = useAppSelector(selectDefaultTopDownElevation);
    const snapToNearestAxis = useAppSelector(selectTopDownSnapToAxis) === undefined;

    const updateClippedFiles = useCallback(async () => {
        const getFileId = async (fileName: string) => {
            const iterator = db.search({ parentPath: fileName, descentDepth: 0 }, undefined);
            const fileId = (await iterator.next()).value;
            return db.descendants(fileId, undefined);
        };

        const objIds = await view.getOutlineObjectsOnScreen();
        if (objIds) {
            const filePaths = new Set<string>();
            await searchByPatterns({
                db,
                searchPatterns: [{ property: "id", value: Array.from(objIds).map((v) => String(v)), exact: true }],
                full: false,
                callback: (files) => {
                    for (const file of files) {
                        const f = getFilePathFromObjectPath(file.path);
                        if (f) {
                            filePaths.add(f);
                        }
                    }
                },
            });
            const files: OutlineGroup[] = [];

            let i = 0;
            const increments = 360 / filePaths.size;
            for (const f of filePaths) {
                const ids = await getFileId(f);
                files.push({ name: f, color: hslToVec(increments * i, 1, 0.5), hidden: false, ids });
                ++i;
            }
            dispatch(clippingOutlineLaserActions.setOutlineGroups(files));
        }
    }, [view, db, dispatch]);

    const handleCrossSection = (_e: ChangeEvent<HTMLInputElement>, checked: boolean) => {
        if (checked) {
            dispatch(renderActions.setPicker(Picker.CrossSection));
        } else {
            dispatch(renderActions.setPicker(Picker.Object));
            dispatch(orthoCamActions.setCrossSectionPoint(undefined));
            dispatch(orthoCamActions.setCrossSectionHover(undefined));
        }
    };

    const handleTopDown = () => {
        dispatch(
            renderActions.setCamera({
                type: CameraType.Orthographic,
                goTo: getTopDownParams({ view, elevation: defaultTopDownElevation, snapToNearestAxis }),
            })
        );
    };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.outlineLaser} disableShadow={menuOpen}>
                    {!menuOpen && !minimized ? (
                        <>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Button
                                    color="grey"
                                    onClick={handleTopDown}
                                    disabled={cameraType === CameraType.Orthographic}
                                >
                                    <ArrowDownward sx={{ mr: 1 }} />
                                    Top-down
                                </Button>
                                <FormControlLabel
                                    control={
                                        <IosSwitch
                                            name="toggle pick measurement"
                                            size="medium"
                                            color="primary"
                                            checked={picker === Picker.OutlineLaser}
                                            disabled={planes.length === 0}
                                            onChange={() => {
                                                if (picker === Picker.OutlineLaser) {
                                                    dispatch(renderActions.setPicker(Picker.Object));
                                                } else {
                                                    dispatch(renderActions.setPicker(Picker.OutlineLaser));
                                                }
                                            }}
                                        />
                                    }
                                    label={<Box fontSize={14}>Laser</Box>}
                                />
                                <Button
                                    onClick={() => dispatch(clippingOutlineLaserActions.clear())}
                                    color="grey"
                                    disabled={!outlineLasers.length}
                                >
                                    <DeleteSweep sx={{ mr: 1 }} />
                                    Clear
                                </Button>
                            </Box>
                        </>
                    ) : null}
                </WidgetHeader>
                <ScrollBox p={1} pb={3} display={menuOpen || minimized ? "none" : "block"}>
                    <FormControlLabel
                        sx={{ ml: 0, mb: 2 }}
                        control={
                            <Switch
                                name="Cross section"
                                checked={picker === Picker.CrossSection}
                                color="primary"
                                onChange={handleCrossSection}
                                disabled={cameraType === CameraType.Pinhole}
                            />
                        }
                        label={
                            <Box ml={1} fontSize={16}>
                                Select cross section
                            </Box>
                        }
                    />
                    <Accordion>
                        <AccordionSummary>Clipping plane</AccordionSummary>
                        <AccordionDetails>
                            <Box flex="0 0 auto">
                                <Box
                                    sx={{
                                        my: 2,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <FormControlLabel
                                        sx={{ marginLeft: 0 }}
                                        control={
                                            <IosSwitch
                                                disabled={planes.length > 5}
                                                checked={picker === Picker.ClippingPlane}
                                                color="primary"
                                                onChange={() =>
                                                    dispatch(
                                                        renderActions.setPicker(
                                                            picker === Picker.ClippingPlane
                                                                ? Picker.Object
                                                                : Picker.ClippingPlane
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
                                <Planes />
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                    <Accordion>
                        <Accordion>
                            <AccordionSummary>Model list</AccordionSummary>
                            <AccordionDetails>
                                <Box flex="0 0 auto">
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
                    </Accordion>
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.outlineLaser.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
