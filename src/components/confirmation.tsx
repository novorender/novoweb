import { Box, BoxProps, Button, Typography } from "@mui/material";

export function Confirmation({
    title,
    confirmBtnText,
    onCancel,
    onConfirm,
    ...boxProps
}: BoxProps & { title: string; confirmBtnText: string; onCancel: () => void; onConfirm: () => void }) {
    return (
        <Box
            display="flex"
            flexDirection="column"
            height={1}
            width={1}
            alignItems="center"
            justifyContent="center"
            {...boxProps}
        >
            <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
                {title}
            </Typography>
            <Box px={6} pb={10} display="flex" width={1}>
                <Button sx={{ mr: 2 }} fullWidth size="large" variant="outlined" color="grey" onClick={onCancel}>
                    Cancel
                </Button>
                <Button fullWidth size="large" variant="contained" color="primary" onClick={onConfirm}>
                    {confirmBtnText}
                </Button>
            </Box>
        </Box>
    );
}
