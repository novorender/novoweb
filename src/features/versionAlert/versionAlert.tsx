import { Warning } from "@mui/icons-material";
import { Box, Button, Checkbox, FormControlLabel, Modal, Typography, useTheme } from "@mui/material";

import { useToggle } from "hooks/useToggle";

const minSupportedMajor = 16;
const minSupportedMinor = 5;
const storageKey = `ignore_os_warning_${minSupportedMajor}_${minSupportedMinor}`;
const runCheck = !localStorage[storageKey];

export function VersionAlert() {
    const theme = useTheme();
    const [modalOpen, toggleModal] = useToggle(true);
    const [hideNext, toggleHideNext] = useToggle(false);

    if (!runCheck) {
        return null;
    }

    const handleSubmit = () => {
        if (hideNext) {
            localStorage[storageKey] = true;
        }
        toggleModal();
    };

    const match = navigator.userAgent.match(
        /(?<device>iPad|iPhone);.+OS (?<major>[\d]{2})_(?<minor>[\d]{1,2})/i
    )?.groups;

    if (!match) {
        return null;
    }

    const major = match.major ? parseInt(match.major) : 0;
    const minor = match.minor ? parseInt(match.minor) : 0;

    if (
        !match.device ||
        !major ||
        major > minSupportedMajor ||
        (major === minSupportedMajor && minor >= minSupportedMinor)
    ) {
        return null;
    }

    const os = match.device === "iPad" ? "iPadOS" : "iOS";

    return (
        <Modal open={modalOpen}>
            <Box display="flex" justifyContent="center" alignItems="center" width={1} height={1}>
                <Box
                    maxWidth={430}
                    borderRadius="4px"
                    bgcolor={theme.palette.common.white}
                    py={8}
                    px={{ xs: 2, sm: 8 }}
                    mx="auto"
                >
                    <Box display="flex" mb={3} fontSize={40} alignItems="center" justifyContent="center">
                        <Warning color="primary" fontSize={"inherit"} />
                    </Box>
                    <Typography mb={1} fontSize={24} fontWeight={700} textAlign="center" component="h1">
                        Unsupported {os} version
                    </Typography>
                    <Typography mb={2}>
                        It looks like you are running {os} v{major}.{minor}. This may result in unexpected issues while
                        using Novorender. We recommend that you upgrade to the latest {os} version available on your
                        device or at least v{minSupportedMajor}.{minSupportedMinor}.
                    </Typography>
                    <FormControlLabel
                        sx={{ mb: 2 }}
                        control={
                            <Checkbox
                                size="small"
                                color="primary"
                                checked={hideNext}
                                onChange={() => toggleHideNext()}
                            />
                        }
                        label={
                            <Box mr={0.5} sx={{ userSelect: "none" }}>
                                Don't show again
                            </Box>
                        }
                    />
                    <Button fullWidth size="large" variant="contained" onClick={handleSubmit}>
                        I understand
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
}
