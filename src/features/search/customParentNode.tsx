import { Visibility } from "@mui/icons-material";
import { Box, Checkbox, ListItemButton, Typography } from "@mui/material";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { ChangeEvent, CSSProperties } from "react";

import { Tooltip } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { hiddenActions, useDispatchHidden } from "contexts/hidden";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { searchDeepByPatterns } from "utils/search";

export function CustomParentNode({
    style,
    abortController,
    searchPatterns,
    loading,
    setLoading,
    allSelected,
    setAllSelected,
    allHidden,
    setAllHidden,
}: {
    style: CSSProperties;
    abortController: React.MutableRefObject<AbortController>;
    searchPatterns: string | SearchPattern[] | undefined;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    allSelected: boolean;
    setAllSelected: (state: boolean) => void;
    allHidden: boolean;
    setAllHidden: (state: boolean) => void;
}) {
    const {
        state: { db },
    } = useExplorerGlobals(true);
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();

    const search = async (callback: (result: ObjectId[]) => void) => {
        if (!searchPatterns) {
            return;
        }

        const abortSignal = abortController.current.signal;

        setLoading(true);

        try {
            await searchDeepByPatterns({
                db,
                searchPatterns,
                abortSignal,
                callback,
            });
        } catch {
            // continue
        }

        setLoading(false);
    };

    const select = async () => {
        await search((ids) => dispatchHighlighted(highlightActions.add(ids)));
        setAllSelected(true);
    };

    const unSelect = async () => {
        await search((ids) => dispatchHighlighted(highlightActions.remove(ids)));
        setAllSelected(false);
    };

    const hide = async () => {
        await search((ids) => dispatchHidden(hiddenActions.add(ids)));
        setAllHidden(true);
    };

    const show = async () => {
        await search((ids) => dispatchHidden(hiddenActions.remove(ids)));
        setAllHidden(false);
    };

    const handleChange = (type: "select" | "hide") => (e: ChangeEvent<HTMLInputElement>) => {
        if (loading) {
            return;
        }

        if (type === "select") {
            return e.target.checked ? select() : unSelect();
        }

        return e.target.checked ? hide() : show();
    };

    return (
        <ListItemButton disableGutters style={{ ...style }} sx={{ paddingLeft: 1, paddingRight: 1 }}>
            <Box display="flex" width={1} alignItems="center">
                <Box display="flex" alignItems="center" width={0} flex={"1 1 100%"}>
                    <Tooltip title={"All results"}>
                        <Typography color={"textSecondary"} noWrap={true}>
                            All results
                        </Typography>
                    </Tooltip>
                </Box>
                <Checkbox
                    name="Toggle highlight of all results"
                    aria-label="Toggle highlight of all results"
                    size="small"
                    onChange={handleChange("select")}
                    checked={allSelected}
                    onClick={(e) => e.stopPropagation()}
                />
                <Checkbox
                    name="Toggle visibility of all results"
                    aria-label="Toggle visibility of all results"
                    size="small"
                    icon={<Visibility />}
                    checkedIcon={<Visibility color="disabled" />}
                    onChange={handleChange("hide")}
                    checked={allHidden}
                    onClick={(e) => e.stopPropagation()}
                />
            </Box>
        </ListItemButton>
    );
}
