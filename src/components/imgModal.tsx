import { Modal, ModalProps, styled } from "@mui/material";
import { css } from "@mui/styled-engine";

export const ImgModal = styled(({ src, ...props }: Omit<ModalProps, "children"> & { src: string }) => {
    return (
        <Modal {...props}>
            <Wrapper>
                <img src={src} alt="" />
            </Wrapper>
        </Modal>
    );
})(
    () => css`
        display: flex;
        justify-content: center;
        align-items: center;
    `
);

const Wrapper = styled("div")(
    ({ theme }) => css`
        max-width: 80%;
        max-height: 80%;
        padding: ${theme.spacing(2)};
        display: inline-flex;
        justify-content: center;
        align-items: center;

        & img {
            display: block;
            max-width: 80vw;
            max-height: 80vh;
            object-fit: contain;
        }
    `
);
