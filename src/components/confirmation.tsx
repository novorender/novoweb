import { LoadingButton } from "@mui/lab";
import { Box, BoxProps, Button, Typography, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";

export function Confirmation({
    title,
    confirmBtnText,
    onCancel,
    onConfirm,
    loading,
    confirmBtnDisabled,
    headerShadow = true,
    paddingBottom = 10,
    ...boxProps
}: BoxProps & {
    title: string;
    confirmBtnText: string;
    onCancel: () => void;
    onConfirm?: () => void;
    loading?: boolean;
    confirmBtnDisabled?: boolean;
    headerShadow?: boolean;
    paddingBottom?: number;
}) {
    const theme = useTheme();
    const { t } = useTranslation();

    return (
        <>
            {headerShadow && (
                <Box
                    boxShadow={theme.customShadows.widgetHeader}
                    sx={{ height: 5, width: 1, mt: "-5px" }}
                    position="absolute"
                />
            )}
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
                <Box pb={paddingBottom} display="flex" width={1}>
                    <Button
                        type="button"
                        sx={{ mr: 2 }}
                        fullWidth
                        size="large"
                        variant="outlined"
                        color="grey"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {t("cancel")}
                    </Button>
                    <LoadingButton
                        fullWidth
                        type="submit"
                        size="large"
                        variant="contained"
                        color="primary"
                        onClick={onConfirm}
                        loading={loading}
                        disabled={confirmBtnDisabled}
                    >
                        {confirmBtnText}
                    </LoadingButton>
                </Box>
            </Box>
        </>
    );
}
