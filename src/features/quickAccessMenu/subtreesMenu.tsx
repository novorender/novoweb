import { Grain, LineAxis, PictureAsPdf, Terrain, Token } from "@mui/icons-material";
import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { renderActions, selectSubtrees, Subtree, SubtreeStatus } from "features/render";

import { ActiveIcon } from "./activeIcon";

export function SubtreesMenu({ onSelect: _onSelect }: { onSelect?: () => void }) {
    const subtrees = useAppSelector(selectSubtrees);
    const dispatch = useAppDispatch();

    const toggle = (subtree: Subtree) => {
        dispatch(renderActions.toggleSubtree({ subtree }));
    };

    return (
        <>
            {subtrees.triangles !== SubtreeStatus.Unavailable && (
                <MenuItem onClick={() => toggle("triangles")}>
                    <ListItemIcon>
                        <ActiveIcon Icon={Token} active={subtrees.triangles === SubtreeStatus.Shown} />
                    </ListItemIcon>
                    <ListItemText>Mesh</ListItemText>
                </MenuItem>
            )}
            {subtrees.lines !== SubtreeStatus.Unavailable && (
                <MenuItem onClick={() => toggle("lines")}>
                    <ListItemIcon>
                        <ActiveIcon Icon={LineAxis} active={subtrees.lines === SubtreeStatus.Shown} />
                    </ListItemIcon>
                    <ListItemText>Lines</ListItemText>
                </MenuItem>
            )}
            {subtrees.terrain !== SubtreeStatus.Unavailable && (
                <MenuItem onClick={() => toggle("terrain")}>
                    <ListItemIcon>
                        <ActiveIcon Icon={Terrain} active={subtrees.terrain === SubtreeStatus.Shown} />
                    </ListItemIcon>
                    <ListItemText>Terrain</ListItemText>
                </MenuItem>
            )}
            {subtrees.points !== SubtreeStatus.Unavailable && (
                <MenuItem onClick={() => toggle("points")}>
                    <ListItemIcon>
                        <ActiveIcon Icon={Grain} active={subtrees.points === SubtreeStatus.Shown} />
                    </ListItemIcon>
                    <ListItemText>Points</ListItemText>
                </MenuItem>
            )}
            {subtrees.documents !== SubtreeStatus.Unavailable && (
                <MenuItem onClick={() => toggle("documents")}>
                    <ListItemIcon>
                        <ActiveIcon Icon={PictureAsPdf} active={subtrees.documents === SubtreeStatus.Shown} />
                    </ListItemIcon>
                    <ListItemText>PDF</ListItemText>
                </MenuItem>
            )}
        </>
    );
}
