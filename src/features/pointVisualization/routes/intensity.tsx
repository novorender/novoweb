import { Box, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { ScrollBox } from "components";
import { VecRGB } from "utils/color";

import ColorIcon from "../components/colorIcon";

type Knot = { position: number; color: VecRGB };

const gradient: { knots: Knot[] } = {
    knots: [
        { position: 0, color: [1, 1, 1] },
        { position: 0.25, color: [0.75, 0.75, 0.75] },
        { position: 0.5, color: [0.5, 0.5, 0.5] },
        { position: 0.75, color: [0.25, 0.25, 0.25] },
        { position: 1, color: [0, 0, 0] },
    ],
};

export function IntensityView() {
    const { t } = useTranslation();

    return (
        <ScrollBox p={2}>
            <Stack gap={2}>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 0fr", gap: 2, alignItems: "center" }}>
                    <div dangerouslySetInnerHTML={{ __html: t("intensityDescriptionHtml") }} />

                    <Stack gap={1}>
                        {gradient.knots.map((knot, i) => (
                            <Row key={i} knot={knot} />
                        ))}
                    </Stack>
                </Box>
            </Stack>
        </ScrollBox>
    );
}

function Row({ knot }: { knot: Knot }) {
    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 40px", alignItems: "center", gap: 1 }}>
            <Typography whiteSpace="nowrap">{knot.position.toFixed(2) + " -"}</Typography>
            <ColorIcon iconColor={knot.color} />
        </Box>
    );
}
