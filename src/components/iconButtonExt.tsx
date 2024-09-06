import { CircularProgress, css, IconButton, IconButtonProps, styled } from "@mui/material";

export default function IconButtonExt({
    loading,
    children,
    ...props
}: IconButtonProps & { loading?: boolean; active?: boolean }) {
    return (
        <StyledIconButton {...props}>
            {loading && <CircularProgress thickness={2.5} sx={{ position: "absolute" }} />}
            {children}
        </StyledIconButton>
    );
}

const StyledIconButton = styled(IconButton, { shouldForwardProp: (prop) => prop !== "active" })<
    IconButtonProps & { active?: boolean }
>(
    ({ theme, active }) => css`
        background-color: ${active ? theme.palette.primary.main : "transparent"};
        color: ${active ? theme.palette.primary.contrastText : "default"};
        &:hover {
            background-color: ${active ? theme.palette.primary.dark : undefined};
        }
    `
);
