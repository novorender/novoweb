import { Close } from "@mui/icons-material";
import { Box, CircularProgress, IconButton, Modal, ModalProps, styled } from "@mui/material";
import { css } from "@mui/styled-engine";
import { useEffect, useState } from "react";

export const ImgModal = styled(
    ({
        src,
        Actions,
        ...props
    }: Omit<ModalProps, "children"> & { src: string; Actions?: () => JSX.Element | null }) => {
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            setLoading(true);
        }, [src]);

        return (
            <Modal {...props}>
                <Wrapper>
                    {loading && <CircularProgress />}
                    {props.onClose && !loading && (
                        <IconButton
                            aria-label="close"
                            onClick={() => props.onClose!({}, "escapeKeyDown")}
                            edge="end"
                            sx={{
                                color: (theme) => theme.palette.grey[100],
                            }}
                        >
                            <Close />
                        </IconButton>
                    )}
                    <img onLoad={() => setLoading(false)} src={src} alt="" />
                    {Actions && !loading && (
                        <Box
                            sx={{
                                mt: 1,
                                width: 1,
                            }}
                        >
                            <Actions />
                        </Box>
                    )}
                </Wrapper>
            </Modal>
        );
    }
)(
    () => css`
        display: flex;
        justify-content: center;
        align-items: center;
    `
);

const Wrapper = styled("div")(
    ({ theme }) => css`
        max-width: 90%;
        max-height: 90%;
        padding: ${theme.spacing(2)};
        display: inline-flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-end;
        position: relative;

        &:focus {
            outline: 0;
        }

        & img {
            display: block;
            max-width: 80vw;
            max-height: 80vh;
            object-fit: contain;
        }
    `
);
