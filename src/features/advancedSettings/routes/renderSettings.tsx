import { ArrowBack, Save } from "@mui/icons-material";
import { Box, Button, FormControlLabel, FormHelperText, Slider, Typography, useTheme } from "@mui/material";
import { useState } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Accordion, AccordionDetails, AccordionSummary, Divider, LinearProgress, ScrollBox, Switch } from "components";
import {
    Subtree,
    SubtreeStatus,
    renderActions,
    selectAdvanced,
    selectDeviceProfile,
    selectPoints,
    selectSubtrees,
    selectTerrain,
} from "features/render";
import { selectUser } from "slices/authSlice";

export function RenderSettings({ save, saving }: { save: () => Promise<void>; saving: boolean }) {
    const history = useHistory();
    const theme = useTheme();

    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const subtrees = useAppSelector(selectSubtrees);
    const deviceProfile = useAppSelector(selectDeviceProfile);
    const advanced = useAppSelector(selectAdvanced);
    const points = useAppSelector(selectPoints);
    const terrain = useAppSelector(selectTerrain);

    const [size, setSize] = useState(points.size.pixel);
    const [maxSize, setMaxSize] = useState(points.size.maxPixel);
    const [toleranceFactor, setToleranceFactor] = useState(points.size.toleranceFactor);
    const [lightExposure, setLightExposure] = useState(advanced.tonemapping.exposure);
    const [maxTris, setMaxTris] = useState(advanced.limits.maxPrimitives);

    const handleSubtreeToggle = (subtree: Subtree) => () => {
        dispatch(renderActions.toggleSubtree({ subtree }));
    };

    const showPointSettings = subtrees?.points !== SubtreeStatus.Unavailable;
    const showMeshSettings = subtrees?.triangles !== SubtreeStatus.Unavailable;
    const showLineSettings = subtrees?.lines !== SubtreeStatus.Unavailable;
    const showTerrainSettings = subtrees?.terrain !== SubtreeStatus.Unavailable;
    const showDocumentSettings = subtrees?.documents !== SubtreeStatus.Unavailable;

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => history.goBack()} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        Back
                    </Button>
                    <Button sx={{ ml: "auto" }} onClick={save} color="grey" disabled={saving}>
                        <Save sx={{ mr: 1 }} />
                        Save
                    </Button>
                </Box>
            </Box>
            {saving ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox height={1} pb={3}>
                {/* <Box p={1} mt={1}>
                    <FormControlLabel
                        sx={{ ml: 0, mb: 1 }}
                        control={<Switch name={AdvancedSetting.AutoFps} checked={autoFps} onChange={handleToggle} />}
                        label={
                            <Box ml={1} fontSize={16}>
                                Dynamic resolution scaling
                            </Box>
                        }
                    />
                    <Divider />
                </Box> */}
                {showMeshSettings ? (
                    <Accordion>
                        <AccordionSummary>Mesh</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    sx={{ ml: 0, mb: 2 }}
                                    control={
                                        <Switch
                                            checked={subtrees && subtrees?.triangles === SubtreeStatus.Shown}
                                            onChange={() =>
                                                dispatch(renderActions.toggleSubtree({ subtree: "triangles" }))
                                            }
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Show
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    sx={{ ml: 0, mb: 2 }}
                                    control={
                                        <Switch
                                            checked={advanced.msaa.enabled}
                                            onChange={(_evt, checked) =>
                                                dispatch(renderActions.setAdvanced({ msaa: { enabled: checked } }))
                                            }
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Anti-aliasing (MSAA)
                                        </Box>
                                    }
                                />
                                {user?.features?.debugInfo?.boundingBoxes ? (
                                    <FormControlLabel
                                        sx={{ ml: 0, mb: 2 }}
                                        control={
                                            <Switch
                                                checked={advanced.debug.showNodeBounds}
                                                onChange={(_evt, checked) =>
                                                    dispatch(
                                                        renderActions.setAdvanced({
                                                            debug: { showNodeBounds: checked },
                                                        })
                                                    )
                                                }
                                            />
                                        }
                                        label={
                                            <Box ml={1} fontSize={16}>
                                                Show node bounds
                                            </Box>
                                        }
                                    />
                                ) : null}
                                <Divider sx={{ borderColor: theme.palette.grey[300], my: 2 }} />

                                <Box display="flex" sx={{ mb: 0 }} alignItems="center">
                                    <Typography
                                        sx={{
                                            width: 160,
                                            flexShrink: 0,
                                        }}
                                    >
                                        Triangle limit
                                    </Typography>
                                    <Slider
                                        sx={{ mx: 2, flex: "1 1 100%" }}
                                        min={500_000}
                                        max={20_000_000}
                                        step={500_000}
                                        valueLabelFormat={(value) => value / 1_000_000}
                                        value={maxTris}
                                        valueLabelDisplay="auto"
                                        onChange={(_evt, value) =>
                                            !Array.isArray(value) ? setMaxTris(value) : undefined
                                        }
                                        onChangeCommitted={(_evt, value) =>
                                            !Array.isArray(value)
                                                ? dispatch(
                                                      renderActions.setAdvanced({ limits: { maxPrimitives: value } })
                                                  )
                                                : undefined
                                        }
                                    />
                                </Box>
                                <FormHelperText>
                                    Value is in millions. Max for this device is{" "}
                                    {deviceProfile.limits.maxPrimitives / 1_000_000} million.
                                </FormHelperText>
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                {showPointSettings ? (
                    <Accordion>
                        <AccordionSummary>Points</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    sx={{ ml: 0, mb: 2 }}
                                    control={
                                        <Switch
                                            checked={subtrees && subtrees?.points === SubtreeStatus.Shown}
                                            onChange={handleSubtreeToggle("points")}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Show
                                        </Box>
                                    }
                                />

                                <Divider sx={{ borderColor: theme.palette.grey[300], mb: 2 }} />

                                <Box display="flex" sx={{ mb: 2 }} alignItems="center">
                                    <Typography
                                        sx={{
                                            width: 160,
                                            flexShrink: 0,
                                        }}
                                    >
                                        Point size (pixels)
                                    </Typography>
                                    <Slider
                                        sx={{ mx: 2, flex: "1 1 100%" }}
                                        min={0}
                                        max={2}
                                        step={0.1}
                                        value={size}
                                        valueLabelDisplay="auto"
                                        onChange={(_evt, value) => (!Array.isArray(value) ? setSize(value) : undefined)}
                                        onChangeCommitted={(_evt, value) =>
                                            !Array.isArray(value)
                                                ? dispatch(renderActions.setPoints({ size: { pixel: value } }))
                                                : undefined
                                        }
                                    />
                                </Box>
                                <Box display="flex" sx={{ mb: 2 }} alignItems="center">
                                    <Typography
                                        sx={{
                                            width: 160,
                                            flexShrink: 0,
                                        }}
                                    >
                                        Max point size
                                    </Typography>
                                    <Slider
                                        sx={{ mx: 2, flex: "1 1 100%" }}
                                        min={1}
                                        max={100}
                                        step={1}
                                        value={maxSize}
                                        valueLabelDisplay="auto"
                                        onChange={(_evt, value) =>
                                            !Array.isArray(value) ? setMaxSize(value) : undefined
                                        }
                                        onChangeCommitted={(_evt, value) =>
                                            !Array.isArray(value)
                                                ? dispatch(renderActions.setPoints({ size: { maxPixel: value } }))
                                                : undefined
                                        }
                                    />
                                </Box>
                                <Box display="flex" alignItems="center">
                                    <Typography
                                        sx={{
                                            width: 160,
                                            flexShrink: 0,
                                        }}
                                    >
                                        Pt. tolerance factor
                                    </Typography>
                                    <Slider
                                        sx={{ mx: 2, flex: "1 1 100%" }}
                                        min={0}
                                        max={2}
                                        step={0.05}
                                        value={toleranceFactor}
                                        valueLabelDisplay="auto"
                                        onChange={(_evt, value) =>
                                            !Array.isArray(value) ? setToleranceFactor(value) : undefined
                                        }
                                        onChangeCommitted={(_evt, value) =>
                                            !Array.isArray(value)
                                                ? dispatch(
                                                      renderActions.setPoints({ size: { toleranceFactor: value } })
                                                  )
                                                : undefined
                                        }
                                    />
                                </Box>
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                {showLineSettings ? (
                    <Accordion>
                        <AccordionSummary>Lines</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    sx={{ ml: 0 }}
                                    control={
                                        <Switch
                                            checked={subtrees && subtrees?.lines === SubtreeStatus.Shown}
                                            onChange={handleSubtreeToggle("lines")}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Show
                                        </Box>
                                    }
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                {showTerrainSettings ? (
                    <Accordion>
                        <AccordionSummary>Terrain</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    sx={{ ml: 0, mb: 2 }}
                                    control={
                                        <Switch
                                            checked={subtrees && subtrees?.terrain === SubtreeStatus.Shown}
                                            onChange={handleSubtreeToggle("terrain")}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Show
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    sx={{ ml: 0, mb: 1 }}
                                    control={
                                        <Switch
                                            checked={terrain.asBackground}
                                            onChange={(_evt, checked) =>
                                                dispatch(renderActions.setTerrain({ asBackground: checked }))
                                            }
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Render terrain as background
                                        </Box>
                                    }
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                {showDocumentSettings ? (
                    <Accordion>
                        <AccordionSummary>PDF</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" flexDirection="column">
                                <FormControlLabel
                                    sx={{ ml: 0 }}
                                    control={
                                        <Switch
                                            checked={subtrees && subtrees?.documents === SubtreeStatus.Shown}
                                            onChange={handleSubtreeToggle("documents")}
                                        />
                                    }
                                    label={
                                        <Box ml={1} fontSize={16}>
                                            Show
                                        </Box>
                                    }
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ) : null}
                <Accordion>
                    <AccordionSummary>Light</AccordionSummary>
                    <AccordionDetails>
                        <Box p={1} display="flex" flexDirection="column">
                            <FormControlLabel
                                sx={{ ml: 0, mb: 1 }}
                                control={
                                    <Switch
                                        checked={advanced.toonOutline.enabled}
                                        onChange={(_evt, checked) =>
                                            dispatch(renderActions.setAdvanced({ toonOutline: { enabled: checked } }))
                                        }
                                    />
                                }
                                label={
                                    <Box ml={1} fontSize={16}>
                                        Toon outlines
                                    </Box>
                                }
                            />

                            <Divider sx={{ borderColor: theme.palette.grey[300], mb: 2 }} />

                            <Box display="flex" alignItems="center">
                                <Typography
                                    sx={{
                                        width: 160,
                                        flexShrink: 0,
                                    }}
                                >
                                    Light exposure
                                </Typography>
                                <Slider
                                    sx={{ mx: 2, flex: "1 1 100%" }}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={lightExposure}
                                    valueLabelDisplay="auto"
                                    onChange={(_evt, value) =>
                                        !Array.isArray(value) ? setLightExposure(value) : undefined
                                    }
                                    onChangeCommitted={(_evt, value) =>
                                        !Array.isArray(value)
                                            ? dispatch(renderActions.setAdvanced({ tonemapping: { exposure: value } }))
                                            : undefined
                                    }
                                />
                            </Box>
                        </Box>
                    </AccordionDetails>
                </Accordion>
            </ScrollBox>
        </>
    );
}
