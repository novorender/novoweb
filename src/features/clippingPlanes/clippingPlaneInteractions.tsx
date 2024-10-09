import {
    CenterFocusWeak,
    CheckBox,
    CheckBoxOutlineBlank,
    ContentCut,
    Delete,
    Info,
    MoreVert,
} from "@mui/icons-material";
import {
    Box,
    css,
    IconButton,
    IconButtonProps,
    ListItemIcon,
    ListItemText,
    MenuItem,
    styled,
    useTheme,
} from "@mui/material";
import { Menu } from "@mui/material";
import { View } from "@novorender/api";
import { vec2, vec3 } from "gl-matrix";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { crossSectionActions } from "features/crossSection";
import { getCameraDir } from "features/engine2D/utils";
import { RenderState, selectClippingPlanes } from "features/render";
import { explorerActions, selectNewDesign, selectWidgets } from "slices/explorer";
import { rgbToHex, vecToRgb } from "utils/color";
import { hasMouseSupport } from "utils/misc";

import { getAnchorPos2d, getClippingPlaneAnchorId, useClippingPlaneActions } from "./useClippingPlaneActions";

const dummyPoint = vec2.fromValues(-100, -100);

export const ClippingPlaneInteractions = forwardRef(function Interactions(_props, ref) {
    const {
        state: { view },
    } = useExplorerGlobals(false);
    const containerRef = useRef<HTMLDivElement>();
    const clipping = useAppSelector(selectClippingPlanes);
    const clippingRef = useRef(clipping);
    clippingRef.current = clipping;
    const [movingPlaneIndex, setMovingPlaneIndex] = useState(-1);
    const movingPlaneIndexRef = useRef(movingPlaneIndex);
    movingPlaneIndexRef.current = movingPlaneIndex;
    const actions = useClippingPlaneActions();

    const points = useMemo(() => (view ? getPoints(view, clipping.planes) : []), [view, clipping]);

    useImperativeHandle(
        ref,
        () => ({
            update: () => {
                if (!view || !containerRef.current || movingPlaneIndexRef.current !== -1) {
                    return;
                }

                const points = getPoints(view, clippingRef.current.planes);
                for (const { point = dummyPoint, index } of points) {
                    const node = containerRef.current.querySelector(
                        `#${getClippingPlaneAnchorId(index)}`,
                    ) as HTMLElement;
                    if (node && point) {
                        node.style.setProperty("left", `${point[0]}px`);
                        node.style.setProperty("top", `${point[1]}px`);
                    }
                }
            },
        }),
        [view],
    );

    if (!view) {
        return null;
    }

    const handlePointerDown = (e: React.PointerEvent, index: number) => {
        if (!view || e.button !== 0) {
            return;
        }

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerCancel);
        setMovingPlaneIndex(index);

        const state = actions.movePlanes(view, clipping.planes, [index]);

        const startPoint = vec2.fromValues(e.clientX, e.clientY);
        const plane = clipping.planes[index];
        const originalAnchorPos = plane.anchorPos!;
        const originalNormalOffset = plane.normalOffset;
        const normal = vec3.fromValues(originalNormalOffset[0], originalNormalOffset[1], originalNormalOffset[2]);
        const cameraDir = getCameraDir(view.renderState.camera.rotation);
        const isFacingNormal = Math.abs(vec3.dot(normal, cameraDir)) > 0.999;

        let posDragedFrom = startPoint;
        const direction = vec3.scaleAndAdd(vec3.create(), originalAnchorPos, normal, -1);
        const dir2d = isFacingNormal
            ? vec2.add(vec2.create(), posDragedFrom, vec2.fromValues(0, 1))
            : view.convert.worldSpaceToScreenSpace([direction])[0]!;
        vec2.sub(dir2d, dir2d, posDragedFrom);
        const lenDir2d = vec2.len(dir2d);
        let newOffset = originalNormalOffset[3];

        const overlay = document.createElement("div");
        overlay.style.setProperty("position", "absolute");
        overlay.style.setProperty("left", "0px");
        overlay.style.setProperty("top", "0px");
        overlay.style.setProperty("width", "100%");
        overlay.style.setProperty("height", "100%");
        overlay.style.setProperty("z", "10000");
        document.body.appendChild(overlay);

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                stop(false);
            }
        }

        function onPointerCancel() {
            stop(false);
        }

        function onPointerUp() {
            stop(true);
        }

        function onPointerMove(e: PointerEvent) {
            const diffMult = e.shiftKey ? 0.1 : 1;
            const posDragedTo = vec2.fromValues(e.clientX, e.clientY);

            const delta = vec2.sub(vec2.create(), posDragedFrom, posDragedTo);

            const step = (vec2.dot(dir2d, delta) / (lenDir2d * lenDir2d)) * diffMult;

            if (Math.abs(step) >= 0.001) {
                newOffset += step;
                state.update([newOffset]);
            }

            posDragedFrom = posDragedTo;
        }

        function stop(save: boolean) {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("pointercancel", onPointerCancel);
            overlay.remove();
            setMovingPlaneIndex(-1);

            state.finish(save);
        }
    };

    return (
        <Box ref={containerRef}>
            {points.map(({ point, index }) => (
                <PlaneBox
                    key={index}
                    index={index}
                    movingPlaneIndex={movingPlaneIndex}
                    handlePointerDown={handlePointerDown}
                    clipping={clipping}
                    point={point}
                />
            ))}
        </Box>
    );
});

function PlaneBox({
    index,
    movingPlaneIndex,
    point = dummyPoint,
    handlePointerDown,
    clipping,
}: {
    index: number;
    movingPlaneIndex: number;
    point: vec2 | undefined;
    handlePointerDown: (e: React.PointerEvent, index: number) => void;
    clipping: RenderState["clipping"];
}) {
    const theme = useTheme();
    const moveBtnRef = useRef<HTMLButtonElement>(null);
    const [isClose, setIsClose] = useState(false);
    const hasMouse = hasMouseSupport();
    const planeRgb = vecToRgb(clipping.planes[index].color);
    planeRgb.a = 1;
    const bgColor = rgbToHex(planeRgb);
    const iconColor = rgbToHex(vecToRgb(clipping.planes[index].outline.color));

    useEffect(() => {
        function onPointerMove(e: PointerEvent) {
            if (!moveBtnRef.current) {
                return;
            }
            const bbox = moveBtnRef.current.getBoundingClientRect();
            const dist = vec2.distance(vec2.fromValues(e.clientX, e.clientY), vec2.fromValues(bbox.x, bbox.y));
            setIsClose(dist < 100);
        }

        if (hasMouse) {
            window.addEventListener("pointermove", onPointerMove);
        }
        return () => {
            if (hasMouse) {
                window.removeEventListener("pointermove", onPointerMove);
            }
        };
    });

    return (
        <Box
            sx={{
                position: "absolute",
                translate: "calc(-17px) calc(-17px)",
                display: "flex",
                gap: 1,
                alignItems: "center",
                opacity: movingPlaneIndex === -1 || movingPlaneIndex === index ? 1 : 0,
                transition: "opacity 0.1s",
            }}
            style={{ left: `${point[0]}px`, top: `${point[1]}px` }}
            id={getClippingPlaneAnchorId(index)}
        >
            <ClippingButton
                size="small"
                onPointerDown={(e) => handlePointerDown(e, index)}
                ref={moveBtnRef}
                iconColor={iconColor}
                bgColor={bgColor}
            >
                <ContentCut />
            </ClippingButton>
            <PlaneMenu clipping={clipping} index={index} visible={movingPlaneIndex === -1 && (!hasMouse || isClose)} />
            <Box
                data-offset
                sx={{
                    position: "absolute",
                    left: 0,
                    top: -40,
                    background: theme.palette.background.paper,
                    px: 0.5,
                    borderRadius: 1,
                    fontSize: "small",
                    color: "grey",
                    display: "none",
                    whiteSpace: "nowrap",
                    translate: "calc(17px - 50%)",
                }}
            >
                Offset
            </Box>
        </Box>
    );
}

function PlaneMenu({
    clipping,
    index,
    visible,
}: {
    clipping: RenderState["clipping"];
    index: number;
    visible: boolean;
}) {
    const {
        state: { view },
    } = useExplorerGlobals(false);
    const { t } = useTranslation();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const dispatch = useAppDispatch();
    const actions = useClippingPlaneActions();
    const plane = clipping.planes[index];
    const isWidgetOpen = useAppSelector((state) => selectWidgets(state).includes(featuresConfig.clippingPlanes.key));
    const newDesign = useAppSelector(selectNewDesign);

    const openMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget.parentElement);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const showWidget = () => {
        dispatch(explorerActions.forceOpenWidget(featuresConfig.clippingPlanes.key));
        closeMenu();
    };

    const swapCamera = () => {
        actions.swapCamera(view!, clipping.planes, index);
        closeMenu();
    };

    const alignCamera = () => {
        actions.alignCamera(view!, clipping.planes, index);
        closeMenu();
    };

    const deletePlane = () => {
        actions.deletePlane(view!, clipping.planes, index);
        closeMenu();
    };

    const toggleOutlines = (enabled: boolean) => {
        actions.toggleOutlines(clipping.planes, index, enabled);
        closeMenu();
    };

    const setShowPlane = (showPlane: boolean) => {
        actions.setShowPlane(clipping.planes, index, showPlane);
        closeMenu();
    };

    const openCrossSection = () => {
        dispatch(explorerActions.forceOpenWidget(featuresConfig.crossSection.key));
        dispatch(crossSectionActions.setPlaneIndex(index));
        closeMenu();
    };

    const handleCrossSectionClick = newDesign ? openCrossSection : swapCamera;
    const CrossSectionIcon = newDesign ? featuresConfig.crossSection.Icon : featuresConfig.orthoCam.Icon;

    visible = visible || Boolean(menuAnchor);

    return (
        <>
            <StyledIconButton
                size="small"
                onClick={openMenu}
                sx={{
                    opacity: visible ? 1 : 0,
                    transition: "opacity 0.1s, translate 0.1s",
                    translate: visible ? 0 : "-20px",
                    mr: 1,
                }}
            >
                <MoreVert fontSize="inherit" />
            </StyledIconButton>

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <MenuItem onClick={showWidget} disabled={isWidgetOpen}>
                    <ListItemIcon>
                        <Info fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t("openWidget")}</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleCrossSectionClick}>
                    <ListItemIcon>
                        <CrossSectionIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t("crossSection")}</ListItemText>
                </MenuItem>
                <MenuItem onClick={alignCamera}>
                    <ListItemIcon>
                        <CenterFocusWeak fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t("alignCamera")}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => toggleOutlines(!plane.outline.enabled)}>
                    <ListItemIcon>
                        {plane.outline.enabled ? (
                            <CheckBox fontSize="small" />
                        ) : (
                            <CheckBoxOutlineBlank fontSize="small" />
                        )}
                    </ListItemIcon>
                    <ListItemText>{t("outlines")}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => setShowPlane(!plane.showPlane)}>
                    <ListItemIcon>
                        {plane.showPlane ? <CheckBox fontSize="small" /> : <CheckBoxOutlineBlank fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>{t(plane.showPlane ? "hidePlane" : "showPlane")}</ListItemText>
                </MenuItem>
                <MenuItem onClick={deletePlane}>
                    <ListItemIcon>
                        <Delete fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t("delete")}</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}

function getPoints(view: View, planes: RenderState["clipping"]["planes"]) {
    const planesWithAnchors = planes.map((plane, index) => ({ plane, index })).filter(({ plane }) => plane?.anchorPos);
    const points = getAnchorPos2d(
        view,
        planesWithAnchors.map(({ plane }) => plane.anchorPos!),
    );
    return planesWithAnchors.map(({ plane, index }, i) => ({
        plane,
        index,
        point: points[i],
    }));
}

const ClippingButton = styled(IconButton, { shouldForwardProp: (prop) => prop !== "bgColor" && prop !== "iconColor" })<
    IconButtonProps & { bgColor: string; iconColor: string }
>(
    ({ bgColor, iconColor }) => css`
        background-color: ${bgColor};
        color: ${iconColor};
        opacity: 0.9;
        transition: opacity 0.2s;
        &:hover {
            background-color: ${bgColor};
            opacity: 1;
        }
    `,
);

const StyledIconButton = styled(IconButton)(
    ({ theme }) => css`
        background-color: ${theme.palette.grey["50"]};
        &:hover {
            background-color: ${theme.palette.grey["200"]};
        }
    `,
);
