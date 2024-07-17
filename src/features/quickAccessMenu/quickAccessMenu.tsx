import { AccountTree, ContentCut, Gradient, Star, Straighten, Terrain } from "@mui/icons-material";
import { Box, ClickAwayListener, Fade, Popper, Stack } from "@mui/material";
import { MouseEvent, useState } from "react";

import { HudPanel } from "components/hudPanel";
import IconButtonExt from "components/iconButtonExt";

import { ClippingMenu } from "./clippingMenu";
import { FavoritesMenu } from "./favoritesMenu";
import { FilesAndAttrsMenu } from "./filesAndAttrsMenu";
import { MeasureMenu } from "./measureMenu";

enum Section {
    Measure,
    Clipping,
    FilesAndAttrs,
    Terrain,
    Layers,
    Favorites,
}

const fadeTimeout = 100;

export function QuickAccessMenu() {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [activeSection, setActiveSection] = useState<Section | null>(null);
    const [open, setOpen] = useState(false);
    const [transformTransitionEnabled, setTransformTransitionEnabled] = useState(false);

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
                        <IconButtonExt
                            onClick={(e) => selectSection(e, Section.Measure)}
                            active={activeSection === Section.Measure}
                        >
                            <Straighten />
                        </IconButtonExt>
                        <IconButtonExt
                            onClick={(e) => selectSection(e, Section.Clipping)}
                            active={activeSection === Section.Clipping}
                        >
                            <ContentCut />
                        </IconButtonExt>
                        <IconButtonExt
                            onClick={(e) => selectSection(e, Section.FilesAndAttrs)}
                            active={activeSection === Section.FilesAndAttrs}
                        >
                            <AccountTree />
                        </IconButtonExt>
                        <IconButtonExt
                            onClick={(e) => selectSection(e, Section.Terrain)}
                            active={activeSection === Section.Terrain}
                        >
                            <Terrain />
                        </IconButtonExt>
                        <IconButtonExt
                            onClick={(e) => selectSection(e, Section.Layers)}
                            active={activeSection === Section.Layers}
                        >
                            <Gradient />
                        </IconButtonExt>
                        <IconButtonExt
                            onClick={(e) => selectSection(e, Section.Favorites)}
                            active={activeSection === Section.Favorites}
                        >
                            <Star />
                        </IconButtonExt>
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
                                {activeSection === Section.Favorites && <FavoritesMenu onSelect={closeMenu} />}
                            </HudPanel>
                        </Fade>
                    )}
                </Popper>
            </Box>
        </ClickAwayListener>
    );
}
