import { Add, DeleteForever } from "@mui/icons-material";
import { Box, Button, IconButton, TextField } from "@mui/material";

import { TunnelInfoGroup } from "../deviationTypes";
import { getActiveErrorText, SubprofileGroupErrors, updateFormField } from "../validation";
import { SectionHeader } from "./sectionHeader";

export function TunnelInfoSection({
    tunnelInfo,
    onChange,
    disabled,
    errors,
}: {
    tunnelInfo: TunnelInfoGroup;
    onChange: (value: TunnelInfoGroup) => void;
    disabled?: boolean;
    errors: SubprofileGroupErrors;
}) {
    if (!tunnelInfo.enabled) {
        if (disabled) {
            return null;
        }

        return (
            <Box display="flex" justifyContent="center" mt={4} mb={2}>
                <Button
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                    size="large"
                    onClick={() => onChange({ ...tunnelInfo, enabled: true })}
                >
                    <Add sx={{ mr: 1 }} /> Add tunnel height
                </Button>
            </Box>
        );
    }

    return (
        <>
            <SectionHeader>Tunnel info</SectionHeader>
            <Box display="flex" alignItems="center" gap={1} mt={2}>
                <TextField
                    fullWidth
                    value={tunnelInfo.heightToCeiling.value}
                    onChange={(e) => onChange({ ...tunnelInfo, heightToCeiling: updateFormField(e.target.value) })}
                    label="Tunnel Height"
                    disabled={disabled}
                    error={errors.heightToCeiling.active}
                    helperText={getActiveErrorText(errors.heightToCeiling)}
                    autoComplete="off"
                />

                <IconButton onClick={() => onChange({ ...tunnelInfo, enabled: false })} disabled={disabled}>
                    <DeleteForever />
                </IconButton>
            </Box>
        </>
    );
}
