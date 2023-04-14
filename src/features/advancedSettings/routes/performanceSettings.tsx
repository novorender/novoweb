import { ChangeEvent, useState } from "react";
import { useTheme, Box, Button, FormControlLabel, Checkbox, CheckboxProps } from "@mui/material";
import { useHistory } from "react-router-dom";
import { ArrowBack, DeleteSweep, Save, Share } from "@mui/icons-material";

import { Divider, ScrollBox, TextField } from "components";
import { api } from "app";

export function PerformanceSettings() {
    const history = useHistory();
    const theme = useTheme();

    const [detailBias, setDetailBias] = useState(String(api.deviceProfile.detailBias));
    const [orthoDetailBias, setOrthoDetailBias] = useState(String(api.deviceProfile.orthoDetailBias));
    const [gpuBytesLimit, setGpuBytesLimit] = useState(String(api.deviceProfile.gpuBytesLimit));
    const [renderResolution, setRenderResolution] = useState(String(api.deviceProfile.renderResolution));
    const [textureResolution, setTextureResolution] = useState(String(api.deviceProfile.textureResolution));
    const [throttleFrames, setThrottleFrames] = useState(String(api.deviceProfile.throttleFrames));
    const [triangleLimit, setTriangleLimit] = useState(String(api.deviceProfile.triangleLimit));
    const [weakDevice, setWeakDevice] = useState(api.deviceProfile.weakDevice);

    const handleChange = (setState: typeof setDetailBias) => (e: ChangeEvent<HTMLInputElement>) => {
        setState(e.target.value);
        api.deviceProfile = {
            ...api.deviceProfile,
            [e.target.name]: Number(e.target.value),
        };
    };

    const toggleWeakDevice: CheckboxProps["onChange"] = (e, checked) => {
        setWeakDevice(checked);
        api.deviceProfile = {
            ...api.deviceProfile,
            weakDevice: checked,
        };
    };

    const handleShare = async () => {
        const { name: _name, hasMajorPerformanceCaveat: _hmpc, discreteGPU: _dGPU, ...toShare } = api.deviceProfile;

        const blob = new Blob(
            [
                encodeURI(
                    `${window.location.origin}${
                        window.location.pathname
                    }?debug=true&debugDeviceProfile=${JSON.stringify(toShare)}`
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
                    "text/plain": new Promise(async (resolve) => {
                        resolve(blob);
                    }),
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
        localStorage["debugDeviceProfile"] = JSON.stringify(api.deviceProfile);
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
                        Back
                    </Button>
                    <Button sx={{ ml: "auto" }} onClick={handleDelete} color="grey">
                        <DeleteSweep sx={{ mr: 1 }} />
                        Delete local
                    </Button>
                    <Button sx={{ ml: "auto" }} onClick={handleSave} color="grey">
                        <Save sx={{ mr: 1 }} />
                        Save local
                    </Button>
                </Box>
            </Box>
            <ScrollBox height={1} px={1} pt={2} mb={4}>
                <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Detail bias"
                    name="detailBias"
                    value={detailBias}
                    onChange={handleChange(setDetailBias)}
                />

                <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Ortho detail bias"
                    name="orthoDetailBias"
                    value={orthoDetailBias}
                    onChange={handleChange(setOrthoDetailBias)}
                />

                <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Triangle limit"
                    name="triangleLimit"
                    value={triangleLimit}
                    onChange={handleChange(setTriangleLimit)}
                />

                <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Gpu bytes limit"
                    name="gpuBytesLimit"
                    value={gpuBytesLimit}
                    onChange={handleChange(setGpuBytesLimit)}
                />

                <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Render resolution scale"
                    name="renderResolution"
                    value={renderResolution}
                    onChange={handleChange(setRenderResolution)}
                />

                <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Texture resolution scale"
                    name="textureResolution"
                    value={textureResolution}
                    onChange={handleChange(setTextureResolution)}
                />

                <TextField
                    sx={{ mt: 2 }}
                    fullWidth
                    size="medium"
                    label="Throttle frames"
                    name="throttleFrames"
                    value={throttleFrames}
                    onChange={handleChange(setThrottleFrames)}
                />

                <Divider sx={{ my: 0.5 }} />

                <FormControlLabel
                    control={<Checkbox size="small" color="primary" checked={weakDevice} onChange={toggleWeakDevice} />}
                    label={
                        <Box mr={0.5} sx={{ userSelect: "none" }}>
                            Weak device
                        </Box>
                    }
                />

                <Divider sx={{ mt: 0.5, mb: 2 }} />

                <Button variant="outlined" onClick={handleShare} color="grey">
                    <Share sx={{ mr: 1 }} fontSize={"small"} />
                    Share
                </Button>
            </ScrollBox>
        </>
    );
}
