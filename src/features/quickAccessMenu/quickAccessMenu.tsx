import { AccountTree, ContentCut, Gradient, Star, Straighten, Terrain } from "@mui/icons-material";
import { Box, ClickAwayListener, Fade, Popper, Stack, Tooltip } from "@mui/material";
import { MouseEvent, useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { HudPanel } from "components/hudPanel";
import IconButtonExt from "components/iconButtonExt";
import { selectSubtrees, SubtreeStatus } from "features/render";

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
                        <Tooltip title={activeSection !== Section.Measure ? "Measurements" : ""} placement="right">
                            <Box>
                                <IconButtonExt
                                    onClick={(e) => selectSection(e, Section.Measure)}
                                    active={activeSection === Section.Measure}
                                >
                                    <Straighten />
                                </IconButtonExt>
                            </Box>
                        </Tooltip>
                        <Tooltip title={activeSection !== Section.Clipping ? "Clippings" : ""} placement="right">
                            <Box>
                                <IconButtonExt
                                    onClick={(e) => selectSection(e, Section.Clipping)}
                                    active={activeSection === Section.Clipping}
                                >
                                    <ContentCut />
                                </IconButtonExt>
                            </Box>
                        </Tooltip>
                        <Tooltip
                            title={activeSection !== Section.FilesAndAttrs ? "Files and attributes" : ""}
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
                        <Tooltip title={activeSection !== Section.Terrain ? "Terrain" : ""} placement="right">
                            <Box>
                                <IconButtonExt
                                    onClick={(e) => selectSection(e, Section.Terrain)}
                                    active={activeSection === Section.Terrain}
                                >
                                    <Terrain />
                                </IconButtonExt>
                            </Box>
                        </Tooltip>
                        {showSubtrees && (
                            <Tooltip title={activeSection !== Section.Subtrees ? "Render types" : ""} placement="right">
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
                        <Tooltip title={activeSection !== Section.Favorites ? "Favorites" : ""} placement="right">
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
