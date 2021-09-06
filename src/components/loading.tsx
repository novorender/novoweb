import { Box, CircularProgress, useTheme } from "@material-ui/core";

export function Loading() {
    const theme = useTheme();

    return (
        <Box
            position="absolute"
            top={0}
            right={0}
            bottom={0}
            left={0}
            bgcolor={theme.palette.secondary.main}
            display="flex"
            justifyContent="center"
            alignItems="center"
            width={1}
            height={1}
        >
            <CircularProgress />
        </Box>
    );
}
