import { AccountTree, Clear, ContentCut, Gradient, Star, Straighten } from "@mui/icons-material";
import {
    Box,
    ClickAwayListener,
    css,
    Fade,
    IconButton,
    IconButtonProps,
    Popper,
    Stack,
    styled,
    Tooltip,
} from "@mui/material";
import { MouseEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { HudPanel } from "components/hudPanel";
import IconButtonExt from "components/iconButtonExt";
import { featuresConfig } from "config/features";
import { Picker, renderActions, selectPicker, selectSubtrees, SubtreeStatus } from "features/render";

import { ClippingMenu } from "./clippingMenu";
import { FavoritesMenu } from "./favoritesMenu";
import { FilesAndAttrsMenu } from "./filesAndAttrsMenu";
import { MeasureMenu } from "./measureMenu";
import { SubtreesMenu } from "./subtreesMenu";

enum Section {
    Measure,
    Clipping,
    FilesAndAttrs,
    Terrain,
    Subtrees,
    Favorites,
}

const fadeTimeout = 100;

export function QuickAccessMenu() {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [activeSection, setActiveSection] = useState<Section | null>(null);
    const [open, setOpen] = useState(false);
    const [transformTransitionEnabled, setTransformTransitionEnabled] = useState(false);
    const subtrees = useAppSelector(selectSubtrees);
    const { t } = useTranslation();

    const closeMenu = () => {
        setOpen(false);
        setTransformTransitionEnabled(false);
        setTimeout(() => {
            setAnchorEl(null);
            setActiveSection(null);
        }, fadeTimeout);
    };

    const selectSection = (e: MouseEvent<HTMLElement>, section: Section) => {
        if (section === activeSection) {
            closeMenu();
        } else {
            setAnchorEl(e.currentTarget);
            setActiveSection(section);
            setOpen(true);
            setTimeout(() => {
                setTransformTransitionEnabled(true);
            }, fadeTimeout);
        }
    };

    const showSubtrees =
        subtrees && Object.values(subtrees).filter((val) => val !== SubtreeStatus.Unavailable).length > 1;

    return (
        <ClickAwayListener onClickAway={closeMenu}>
            <Box
                sx={{
                    zIndex: 1050,
                    pointerEvents: "none",
                    display: "grid",
                    placeItems: "end center",
                    position: "absolute",
                    // 420px is approx location HUD + nav cube
                    top: "max(50%, 420px)",
                    translate: "0 -50%",
                }}
            >
                <HudPanel
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        transition: "all 0.2s",
                        pointerEvents: "auto",
                    }}
                >
                    <Stack gap={1}>
                        <MeasureMenuRoot
                            activeSection={activeSection}
                            closeMenu={closeMenu}
                            selectSection={selectSection}
                        />
                        <ClippingMenuRoot
                            activeSection={activeSection}
                            closeMenu={closeMenu}
                            selectSection={selectSection}
                        />
                        <Tooltip
                            title={activeSection !== Section.FilesAndAttrs ? t("filesAndAttributes") : ""}
                            placement="right"
                        >
                            <Box>
                                <IconButtonExt
                                    onClick={(e) => selectSection(e, Section.FilesAndAttrs)}
                                    active={activeSection === Section.FilesAndAttrs}
                                >
                                    <AccountTree />
                                </IconButtonExt>
                            </Box>
                        </Tooltip>
                        {/* <Tooltip title={activeSection !== Section.Terrain ? t("terrain") : ""} placement="right">
                            <Box>
                                <IconButtonExt
                                    onClick={(e) => selectSection(e, Section.Terrain)}
                                    active={activeSection === Section.Terrain}
                                >
                                    <Terrain />
                                </IconButtonExt>
                            </Box>
                        </Tooltip> */}
                        {showSubtrees && (
                            <Tooltip
                                title={activeSection !== Section.Subtrees ? t("renderTypes") : ""}
                                placement="right"
                            >
                                <Box>
                                    <IconButtonExt
                                        onClick={(e) => selectSection(e, Section.Subtrees)}
                                        active={activeSection === Section.Subtrees}
                                    >
                                        <Gradient />
                                    </IconButtonExt>
                                </Box>
                            </Tooltip>
                        )}
                        <Tooltip title={activeSection !== Section.Favorites ? t("favorites") : ""} placement="right">
                            <Box>
                                <IconButtonExt
                                    onClick={(e) => selectSection(e, Section.Favorites)}
                                    active={activeSection === Section.Favorites}
                                >
                                    <Star />
                                </IconButtonExt>
                            </Box>
                        </Tooltip>
                    </Stack>
                </HudPanel>

                <Popper
                    open={open}
                    anchorEl={anchorEl}
                    placement="right"
                    sx={{ transition: transformTransitionEnabled ? "transform 0.1s" : undefined }}
                    transition
                >
                    {({ TransitionProps }) => (
                        <Fade {...TransitionProps} timeout={fadeTimeout}>
                            <HudPanel sx={{ ml: 2 }}>
                                {activeSection === Section.Measure && <MeasureMenu onSelect={closeMenu} />}
                                {activeSection === Section.Clipping && <ClippingMenu onSelect={closeMenu} />}
                                {activeSection === Section.FilesAndAttrs && <FilesAndAttrsMenu onSelect={closeMenu} />}
                                {activeSection === Section.Subtrees && <SubtreesMenu onSelect={closeMenu} />}
                                {activeSection === Section.Favorites && <FavoritesMenu onSelect={closeMenu} />}
                            </HudPanel>
                        </Fade>
                    )}
                </Popper>
            </Box>
        </ClickAwayListener>
    );
}

function MeasureMenuRoot({
    activeSection,
    selectSection,
    closeMenu,
}: {
    activeSection: Section | null;
    selectSection: (e: MouseEvent<HTMLElement>, section: Section) => void;
    closeMenu: () => void;
}) {
    const { t } = useTranslation();
    const picker = useAppSelector(selectPicker);
    const dispatch = useAppDispatch();

    let Icon: typeof featuresConfig.measure.Icon | undefined = undefined;
    switch (picker) {
        case Picker.Measurement:
            Icon = featuresConfig.measure.Icon;
            break;
        case Picker.Area:
            Icon = featuresConfig.area.Icon;
            break;
        case Picker.OutlineLaser:
            Icon = featuresConfig.outlineLaser.Icon;
            break;
        case Picker.Manhole:
            Icon = featuresConfig.manhole.Icon;
            break;
        case Picker.PointLine:
            Icon = featuresConfig.pointLine.Icon;
            break;
    }
    const isSectionPicker = Icon !== undefined;

    return (
        <Tooltip title={activeSection !== Section.Measure ? t("measurements") : ""} placement="right">
            <Box position="relative">
                <StyledIconButton
                    onClick={(e) => {
                        if (isSectionPicker) {
                            dispatch(renderActions.stopPicker(picker));
                            closeMenu();
                        } else {
                            selectSection(e, Section.Measure);
                        }
                    }}
                    isCurrentSection={activeSection === Section.Measure}
                    isCurrentPicker={isSectionPicker}
                >
                    {Icon ? <Icon /> : <Straighten />}
                    <Box className="corner-icon">
                        <Clear />
                    </Box>
                </StyledIconButton>
            </Box>
        </Tooltip>
    );
}

function ClippingMenuRoot({
    activeSection,
    selectSection,
    closeMenu,
}: {
    activeSection: Section | null;
    selectSection: (e: MouseEvent<HTMLElement>, section: Section) => void;
    closeMenu: () => void;
}) {
    const { t } = useTranslation();
    const picker = useAppSelector(selectPicker);
    const dispatch = useAppDispatch();

    let Icon: typeof featuresConfig.measure.Icon | undefined = undefined;
    switch (picker) {
        case Picker.ClippingPlane:
            Icon = featuresConfig.clippingPlanes.Icon;
            break;
    }
    const isSectionPicker = Icon !== undefined;

    return (
        <Tooltip title={activeSection !== Section.Clipping ? t("clipping") : ""} placement="right">
            <Box position="relative">
                <StyledIconButton
                    onClick={(e) => {
                        if (isSectionPicker) {
                            dispatch(renderActions.stopPicker(picker));
                            closeMenu();
                        } else {
                            selectSection(e, Section.Clipping);
                        }
                    }}
                    isCurrentSection={activeSection === Section.Clipping}
                    isCurrentPicker={isSectionPicker}
                >
                    {Icon ? <Icon /> : <ContentCut />}
                    <Box className="corner-icon">
                        <Clear />
                    </Box>
                </StyledIconButton>
            </Box>
        </Tooltip>
    );
}

const StyledIconButton = styled(IconButton, {
    shouldForwardProp: (prop) => prop !== "isCurrentSection" && prop !== "isCurrentPicker",
})<IconButtonProps & { isCurrentSection: boolean; isCurrentPicker: boolean }>(
    ({ theme, isCurrentSection, isCurrentPicker }) => css`
        &,
        &:hover {
            background-color: ${isCurrentSection || isCurrentPicker ? theme.palette.primary.main : "transparent"};
            color: ${isCurrentSection || isCurrentPicker ? theme.palette.primary.contrastText : "default"};
        }

        & .corner-icon {
            position: absolute;
            display: grid;
            opacity: ${isCurrentPicker ? 1 : 0};
            place-items: center;
            top: 0;
            right: 0;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: ${theme.palette.grey[700]};
            color: ${theme.palette.primary.contrastText};
            transition: all 0.2s;
        }
        &:hover .corner-icon {
            width: 40px;
            height: 40px;
            background: ${theme.palette.grey[800]};
        }

        & .corner-icon svg {
            font-size: 16px;
            transition: font-size 0.2s;
        }
        &:hover .corner-icon svg {
            font-size: 1.5rem;
        }
    `,
);
