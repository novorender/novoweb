import { css, styled } from "@mui/material";
import { SVGProps } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { featuresConfig } from "config/features";
import { renderActions } from "features/render";
import { explorerActions } from "slices/explorer";
import { ViewMode } from "types/misc";

import {
    followPathActions,
    selectFollowObject,
    selectProfile,
    selectProfileRange,
    selectStep,
} from "./followPathSlice";
import { useGoToProfile } from "./useGoToProfile";

const markerStyles = () => css`
    cursor: pointer;
    pointer-events: auto;
    filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.3));

    :hover {
        path {
            stroke: grey;
        }
        circle {
            stroke: grey;
            fill: white;
        }
    }
    path {
        stroke: black;
    }
    circle {
        stroke: black;
        fill: white;
    }
`;

const PlusMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="24" height="24" fillOpacity={0} transform={"translate(88 88)"} />
            <circle r="12" transform={"translate(100 100)"} />
            <path d="M95,100 L105,100 M100,95 L100,105" strokeWidth={2}></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)(markerStyles);

const MinusMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="24" height="24" fillOpacity={0} transform={"translate(88 88)"} />
            <circle r="12" transform={"translate(100 100)"} />
            <path d="M95,100 L105,100" strokeWidth={2}></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)(markerStyles);

const InfoMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="24" height="24" fillOpacity={0} transform={"translate(88 88)"} />
            <circle r="12" transform={"translate(100 100)"} />
            <path
                d="M 12 5 A 1 1 0 0 0 12 7 A 1 1 0 0 0 12 5 M 11 10 H 13 V 17 H 11 Z"
                transform="translate(88 88)"
            ></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)(markerStyles);

const CloseMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="24" height="24" fillOpacity={0} transform={"translate(88 88)"} />
            <circle r="12" transform={"translate(100 100)"} />
            <path d="M6 18 18 6M6 6l12 12" strokeWidth={2} transform={"translate(88 88)"}></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)(markerStyles);

export function FollowInteractions() {
    const goToProfile = useGoToProfile();
    const profile = useAppSelector(selectProfile);
    const fpObj = useAppSelector(selectFollowObject);
    const step = useAppSelector(selectStep);
    const dispatch = useAppDispatch();
    const profileRange = useAppSelector(selectProfileRange);

    const stepFollow = (dir: number) => {
        if (fpObj) {
            const p = Number(profile);
            let next = p + dir * Number(step || "1");
            if (Number.isNaN(next)) {
                next = 1;
            }
            if (profileRange) {
                if (next > profileRange.max) {
                    next = profileRange.max;
                } else if (next < profileRange.min) {
                    next = profileRange.min;
                }
            }

            dispatch(followPathActions.setProfile(next.toFixed(3)));
            goToProfile({ p: next, fpObj });
        }
    };

    return (
        <>
            <PlusMarker
                id={`followPlus`}
                name={`followPlus`}
                onClick={() => {
                    stepFollow(1);
                }}
            />
            <MinusMarker
                id={`followMinus`}
                name={`followMinus`}
                onClick={() => {
                    stepFollow(-1);
                }}
            />
            <InfoMarker
                id={`followInfo`}
                name={`followInfo`}
                onClick={() => {
                    dispatch(followPathActions.setLastViewedRouterPath("/followIds"));
                    dispatch(followPathActions.setGoToRouterPath("/followIds"));
                    dispatch(explorerActions.forceOpenWidget(featuresConfig.followPath.key));
                }}
            />
            <CloseMarker
                id="followClose"
                name="followClose"
                onClick={() => {
                    dispatch(renderActions.setViewMode(ViewMode.Default));
                }}
            />
        </>
    );
}
