import { Box, BoxProps, Button, Typography } from "@mui/material";

export function Confirmation({
    title,
    confirmBtnText,
    onCancel,
    onConfirm,
    ...boxProps
}: BoxProps & { title: string; confirmBtnText: string; onCancel: () => void; onConfirm?: () => void }) {
    return (
        <Box
            display="flex"
            flexDirection="column"
            height={1}
            width={1}
            alignItems="center"
            justifyContent="center"
            px={2}
            {...boxProps}
        >
            <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
                {title}
            </Typography>
            {boxProps.children}
            <Box pb={10} display="flex" width={1}>
                <Button
                    type="button"
                    sx={{ mr: 2 }}
                    fullWidth
                    size="large"
                    variant="outlined"
                    color="grey"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Button fullWidth type="submit" size="large" variant="contained" color="primary" onClick={onConfirm}>
                    {confirmBtnText}
                </Button>
            </Box>
        </Box>
    );
}
