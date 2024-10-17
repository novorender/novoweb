import { ExpandMore } from "@mui/icons-material";
import { accordionSummaryClasses, Badge, Box, css, FormControlLabel, styled, Typography } from "@mui/material";
import { memo, useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Accordion, AccordionDetails, AccordionSummary, IosSwitch, LinearProgress } from "components";
import { AsyncStatus } from "types/misc";

import { deviationsActions } from "../deviationsSlice";
import { useCalcSubprofileDevDistr } from "../hooks/useCalcSubprofileDevDistr";
import { useIsTopDownOrthoCamera } from "../hooks/useIsTopDownOrthoCamera";
import {
    selectCurrentSubprofileDeviationDistributions,
    selectRangeFollowsCamera,
    selectSelectedSubprofile,
} from "../selectors";
import { CenterlineMinimap } from "./centerlineMinimap";
import { ColorGradientMap } from "./colorGradientMap";
import { RootParamBounds } from "./rootParamBounds";

export const DistributionSection = memo(DistributionSectionInner);

function DistributionSectionInner() {
    const isTopDownOrthoCamera = useIsTopDownOrthoCamera();
    const [distrExpanded, setDistrExpanded] = useState(false);
    const [hasDistributionData, setHasDistributionData] = useState(false);
    const rangeFollowsCamera = useAppSelector(selectRangeFollowsCamera);
    const distribution = useAppSelector(selectCurrentSubprofileDeviationDistributions);
    const selectedSubprofile = useAppSelector(selectSelectedSubprofile);

    const dispatch = useAppDispatch();

    useCalcSubprofileDevDistr();

    useEffect(() => {
        if (
            distribution?.data.status === AsyncStatus.Success &&
            (distribution.data.data.aggregatesAlongProfile.length > 0 ||
                distribution.data.data.pointCountAtDeviation.length > 0)
        ) {
            setHasDistributionData(true);
        }
    }, [distribution]);

    if (!hasDistributionData || !selectedSubprofile?.centerLine) {
        return null;
    }

    return (
        <Accordion expanded={distrExpanded} onChange={(_e, expand) => setDistrExpanded(expand)}>
            <BetaAccordionSummary expandIcon={<ExpandMore />}>
                <Badge badgeContent="beta" color="info">
                    <Box mx={1} fontWeight="600" fontSize="1.5rem">
                        Distribution
                    </Box>
                </Badge>
            </BetaAccordionSummary>
            <AccordionDetails>
                {distribution?.data.status === AsyncStatus.Loading ? (
                    <Box position="relative">
                        <LinearProgress />
                    </Box>
                ) : distribution?.data.status === AsyncStatus.Error ? (
                    <Typography m={2} color="grey" textAlign="center">
                        Error getting distribution info
                    </Typography>
                ) : undefined}

                <Box px={2} pt={1}>
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
            </AccordionDetails>
        </Accordion>
    );
}

const BetaAccordionSummary = styled(AccordionSummary)(
    () => css`
        & .${accordionSummaryClasses.content} {
            padding-top: 12px;
        }
    `,
);
