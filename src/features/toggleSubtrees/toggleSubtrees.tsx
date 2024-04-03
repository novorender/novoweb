import { Grain, LineAxis, PictureAsPdf, Terrain, Token } from "@mui/icons-material";
import { IconButton, Menu, SpeedDialActionProps, Typography } from "@mui/material";
import { MouseEvent, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { SpeedDialAction, WidgetMenuButtonWrapper } from "components";
import { featuresConfig } from "config/features";
import { renderActions, selectSubtrees, selectViewMode, SubtreeStatus } from "features/render";
import { ViewMode } from "types/misc";

export function ToggleSubtrees(speedDialProps: SpeedDialActionProps) {
    const { name, Icon } = featuresConfig["toggleSubtrees"];
    const subtrees = useAppSelector(selectSubtrees);
    const viewMode = useAppSelector(selectViewMode);
    const dispatch = useAppDispatch();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const canChange = subtrees && Object.values(subtrees).filter((val) => val !== SubtreeStatus.Unavailable).length > 1;
    if (!canChange) {
        return null;
    }

    const openMenu = (e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const disabled = viewMode === ViewMode.Panorama;
    return (
        <>
            <SpeedDialAction
                {...speedDialProps}
                data-test="toggle-subtrees"
                FabProps={{
                    disabled,
                    ...speedDialProps.FabProps,
                }}
                onClick={openMenu}
                title={name}
                icon={<Icon />}
            />
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor) && !disabled}
                onClick={(e) => e.stopPropagation()}
                onClose={closeMenu}
                anchorOrigin={{ horizontal: 50, vertical: -35 }}
                MenuListProps={{ sx: { pl: 3, py: 2, display: "flex" } }}
            >
                {subtrees.triangles !== SubtreeStatus.Unavailable ? (
                    <li>
                        <WidgetMenuButtonWrapper
                            mr={3}
                            activeCurrent={subtrees.triangles === SubtreeStatus.Shown}
                            onClick={() => dispatch(renderActions.toggleSubtree({ subtree: "triangles" }))}
                        >
                            <IconButton size="large" color="primary">
                                <Token />
                            </IconButton>
                            <Typography>Mesh</Typography>
                        </WidgetMenuButtonWrapper>
                    </li>
                ) : null}
                {subtrees.lines !== SubtreeStatus.Unavailable ? (
                    <li>
                        <WidgetMenuButtonWrapper
                            mr={3}
                            activeCurrent={subtrees.lines === SubtreeStatus.Shown}
                            onClick={() => dispatch(renderActions.toggleSubtree({ subtree: "lines" }))}
                        >
                            <IconButton size="large" color="primary">
                                <LineAxis />
                            </IconButton>
                            <Typography>Lines</Typography>
                        </WidgetMenuButtonWrapper>
                    </li>
                ) : null}
                {subtrees.terrain !== SubtreeStatus.Unavailable ? (
                    <li>
                        <WidgetMenuButtonWrapper
                            mr={3}
                            activeCurrent={subtrees.terrain === SubtreeStatus.Shown}
                            onClick={() => dispatch(renderActions.toggleSubtree({ subtree: "terrain" }))}
                        >
                            <IconButton size="large" color="primary">
                                <Terrain />
                            </IconButton>
                            <Typography>Terrain</Typography>
                        </WidgetMenuButtonWrapper>
                    </li>
                ) : null}
                {subtrees.points !== SubtreeStatus.Unavailable ? (
                    <li>
                        <WidgetMenuButtonWrapper
                            mr={3}
                            activeCurrent={subtrees.points === SubtreeStatus.Shown}
                            onClick={() => dispatch(renderActions.toggleSubtree({ subtree: "points" }))}
                        >
                            <IconButton size="large" color="primary">
                                <Grain />
                            </IconButton>
                            <Typography>Points</Typography>
                        </WidgetMenuButtonWrapper>
                    </li>
                ) : null}
                {subtrees.documents !== SubtreeStatus.Unavailable ? (
                    <li>
                        <WidgetMenuButtonWrapper
                            mr={3}
                            activeCurrent={subtrees.documents === SubtreeStatus.Shown}
                            onClick={() => dispatch(renderActions.toggleSubtree({ subtree: "documents" }))}
                        >
                            <IconButton size="large" color="primary">
                                <PictureAsPdf />
                            </IconButton>
                            <Typography>PDF</Typography>
                        </WidgetMenuButtonWrapper>
                    </li>
                ) : null}
            </Menu>
        </>
    );
}
