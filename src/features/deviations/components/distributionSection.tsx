import { ExpandMore } from "@mui/icons-material";
import {
    Accordion as MuiAccordion,
    AccordionDetails as MuiAccordionDetails,
    AccordionSummary as MuiAccordionSummary,
    Badge,
    Box,
    css,
    FormControlLabel,
    styled,
    Typography,
} from "@mui/material";
import { memo, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { IosSwitch, LinearProgress } from "components";
import { AsyncStatus } from "types/misc";

import { deviationsActions } from "../deviationsSlice";
import { useCalcSubprofileDevDistr } from "../hooks/useCalcSubprofileDevDistr";
import { useIsTopDownOrthoCamera } from "../hooks/useIsTopDownOrthoCamera";
import { selectCurrentSubprofileDeviationDistributions, selectRangeFollowsCamera } from "../selectors";
import { CenterlineMinimap } from "./centerlineMinimap";
import { ColorGradientMap } from "./colorGradientMap";
import { RootParamBounds } from "./rootParamBounds";

export const DistributionSection = memo(DistributionSectionInner);

function DistributionSectionInner() {
    const isTopDownOrthoCamera = useIsTopDownOrthoCamera();
    const [distrExpanded, setDistrExpanded] = useState(false);
    const rangeFollowsCamera = useAppSelector(selectRangeFollowsCamera);
    const distribution = useAppSelector(selectCurrentSubprofileDeviationDistributions);

    const dispatch = useAppDispatch();

    useCalcSubprofileDevDistr({ skip: !distrExpanded });

    return (
        <BetaAccordion expanded={distrExpanded} onChange={(_e, expand) => setDistrExpanded(expand)}>
            <BetaAccordionSummary expandIcon={<ExpandMore />}>
                <Badge badgeContent="beta" color="info">
                    <Box mx={1} mb={1} fontWeight="600" fontSize="1.5rem">
                        Distribution
                    </Box>
                </Badge>
            </BetaAccordionSummary>
            <BetaAccordionDetails>
                {distribution?.data.status === AsyncStatus.Loading ? (
                    <Box position="relative">
                        <LinearProgress />
                    </Box>
                ) : distribution?.data.status === AsyncStatus.Error ? (
                    <Typography m={2} color="grey" textAlign="center">
                        Error getting distribution info
                    </Typography>
                ) : undefined}

                <Box mt={1}>
                    {isTopDownOrthoCamera && (
                        <Box>
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={rangeFollowsCamera}
                                        onChange={(e) => {
                                            dispatch(deviationsActions.setRangeFollowsCamera(e.target.checked));
                                        }}
                                    />
                                }
                                label={<Box>Range follows camera</Box>}
                            />
                        </Box>
                    )}
                    <RootParamBounds />

                    <Box mt={2}>Deviation distribution along the profile</Box>
                    <CenterlineMinimap />

                    <Box mt={2}>Point count distribution by deviation</Box>
                    <ColorGradientMap />
                </Box>
            </BetaAccordionDetails>
        </BetaAccordion>
    );
}

const BetaAccordion = styled(MuiAccordion)(
    () => css`
        box-shadow: none;

        &.Mui-expanded {
            margin: 0;
        }

        &::before {
            opacity: 0;
        }
    `
);

const BetaAccordionSummary = styled(MuiAccordionSummary)(
    () => css`
        padding: 0;

        &,
        &.Mui-expanded {
            min-height: 84px;
        }
    `
);

const BetaAccordionDetails = styled(MuiAccordionDetails)(
    () => css`
        padding-left: 0;
        padding-right: 0;
    `
);
