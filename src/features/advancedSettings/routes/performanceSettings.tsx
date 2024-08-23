import { ArrowBack, DeleteSweep, Save, Share } from "@mui/icons-material";
import {
    Box,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Typography,
    useTheme,
} from "@mui/material";
import { getDeviceProfile, GPUTier } from "@novorender/api";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, ScrollBox, TextField } from "components";
import { renderActions, selectDebugStats, selectDeviceProfile } from "features/render";

export function PerformanceSettings() {
    const { t } = useTranslation();
    const history = useHistory();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const deviceProfile = useAppSelector(selectDeviceProfile);

    const [detailBias, setDetailBias] = useState(String(deviceProfile.detailBias));
    const [gpuBytesLimit, setGpuBytesLimit] = useState(String(deviceProfile.limits.maxGPUBytes));
    const [renderResolution, setRenderResolution] = useState(String(deviceProfile.renderResolution));
    const [framerateTarget, setFramerateTarget] = useState(String(deviceProfile.framerateTarget));
    const [triangleLimit, setTriangleLimit] = useState(String(deviceProfile.limits.maxPrimitives));
    const [sampleLimit, setSampleLimit] = useState(String(deviceProfile.limits.maxSamples));
    const debugStats = useAppSelector(selectDebugStats);

    useEffect(() => {
        setDetailBias(String(deviceProfile.detailBias));
        setGpuBytesLimit(String(deviceProfile.limits.maxGPUBytes));
        setRenderResolution(String(deviceProfile.renderResolution));
        setFramerateTarget(String(deviceProfile.framerateTarget));
        setTriangleLimit(String(deviceProfile.limits.maxPrimitives));
        setSampleLimit(String(deviceProfile.limits.maxSamples));
    }, [deviceProfile]);

    const deviceProfiles = useMemo(() => {
        const tiers: GPUTier[] = [0, 1, 2, 3];
        return tiers.map((tier) => getDeviceProfile(tier));
    }, []);

    const currentTier = useMemo(() => {
        return deviceProfiles.find((p) => p.tier === deviceProfile.tier)?.tier ?? 0;
    }, [deviceProfiles, deviceProfile]);

    const handleTier = (e: SelectChangeEvent) => {
        const tier = Number(e.target.value) as GPUTier;
        const profile = deviceProfiles.find((p) => p.tier === tier);
        if (profile) {
            dispatch(renderActions.setDeviceProfile(profile));
        }
    };

    const handleChange = (setState: typeof setDetailBias) => (e: ChangeEvent<HTMLInputElement>) => {
        setState(e.target.value);
    };

    const handleBlur = () => {
        dispatch(
            renderActions.setDeviceProfile({
                detailBias: Number(detailBias),
                limits: {
                    maxGPUBytes: Number(gpuBytesLimit),
                    maxPrimitives: Number(triangleLimit),
                    maxSamples: Number(sampleLimit),
                },
                framerateTarget: Number(framerateTarget),
                renderResolution: Number(renderResolution),
            })
        );
    };

    const handleShare = async () => {
        const blob = new Blob(
            [
                encodeURI(
                    `${window.location.origin}${
                        window.location.pathname
                    }?debug=true&debugDeviceProfile=${JSON.stringify(deviceProfile)}`
                ),
            ],
            {
                type: "text/plain",
            }
        );

        try {
            // Safari treats user activation differently:
            // https://bugs.webkit.org/show_bug.cgi?id=222262.
            await navigator.clipboard.write([
                new ClipboardItem({
                    "text/plain": Promise.resolve(blob),
                }),
            ]);
        } catch (e) {
            console.warn(e);

            navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob,
                }),
            ]);
        }
    };

    const handleSave = () => {
        localStorage["debugDeviceProfile"] = JSON.stringify(deviceProfile);
    };

    const handleDelete = () => {
        localStorage.removeItem("debugDeviceProfile");
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => history.goBack()} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                    <Button sx={{ ml: "auto" }} onClick={handleDelete} color="grey">
                        <DeleteSweep sx={{ mr: 1 }} />
                        {t("deleteLocal")}
                    </Button>
                    <Button sx={{ ml: "auto" }} onClick={handleSave} color="grey">
                        <Save sx={{ mr: 1 }} />
                        {t("saveLocal")}
                    </Button>
                </Box>
            </Box>
            <ScrollBox height={1} px={1} mt={1} mb={4}>
                <Typography pt={1} variant="h6" fontWeight={600}>
                    t("performanceSettings")
                </Typography>
                <Divider sx={{ my: 1 }} />
                {debugStats.enabled && (
                    <FormControl fullWidth sx={{ mt: 2 }} size="small">
                        <InputLabel id="tier-select-label">Tier</InputLabel>
                        <Select
                            value={`${currentTier}`}
                            onChange={handleTier}
                            id="tier-select"
                            label="Tier"
                            labelId="tier-select-label"
                        >
                            {deviceProfiles.map((profile) => (
                                <MenuItem key={profile.tier} value={profile.tier}>
                                    {profile.tier}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
                <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Detail bias"
                    name="detailBias"
                    value={detailBias}
                    onChange={handleChange(setDetailBias)}
                    onBlur={handleBlur}
                />

                {/* <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Ortho detail bias"
                    name="orthoDetailBias"
                    value={orthoDetailBias}
                    onChange={handleChange(setOrthoDetailBias)}
                /> */}

                <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Triangle limit"
                    name="triangleLimit"
                    value={triangleLimit}
                    onChange={handleChange(setTriangleLimit)}
                    onBlur={handleBlur}
                />

                <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Gpu bytes limit"
                    name="gpuBytesLimit"
                    value={gpuBytesLimit}
                    onChange={handleChange(setGpuBytesLimit)}
                    onBlur={handleBlur}
                />

                <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Sample limit"
                    name="sampleLimit"
                    value={sampleLimit}
                    onChange={handleChange(setSampleLimit)}
                    onBlur={handleBlur}
                />

                <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Render resolution scale"
                    name="renderResolution"
                    value={renderResolution}
                    onChange={handleChange(setRenderResolution)}
                    onBlur={handleBlur}
                />

                {/* <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Texture resolution scale"
                    name="textureResolution"
                    value={textureResolution}
                    onChange={handleChange(setTextureResolution)}
                /> */}

                {/* <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Throttle frames"
                    name="throttleFrames"
                    value={throttleFrames}
                    onChange={handleChange(setThrottleFrames)}
                /> */}

                <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Framerate target"
                    value={framerateTarget}
                    onChange={handleChange(setFramerateTarget)}
                    onBlur={handleBlur}
                />

                <Divider sx={{ my: 0.5 }} />

                {/* <FormControlLabel
                    control={<Checkbox size="small" color="primary" checked={weakDevice} onChange={toggleWeakDevice} />}
                    label={
                        <Box mr={0.5} sx={{ userSelect: "none" }}>
                            Weak device
                        </Box>
                    }
                /> */}

                <Box>
                    <FormControlLabel
                        control={
                            <Checkbox
                                name="outline"
                                size="small"
                                color="primary"
                                checked={deviceProfile.features.outline}
                                onChange={(_evt, checked) =>
                                    dispatch(renderActions.setDeviceProfile({ features: { outline: checked } }))
                                }
                            />
                        }
                        label={
                            <Box mr={0.5} sx={{ userSelect: "none" }}>
                                {t("outline")}
                            </Box>
                        }
                    />
                </Box>

                <Divider sx={{ mt: 0.5, mb: 2 }} />

                <Button variant="outlined" onClick={handleShare} color="grey">
                    <Share sx={{ mr: 1 }} fontSize={"small"} />
                    {t("share")}
                </Button>
            </ScrollBox>
        </>
    );
}
