import { SyncAlt } from "@mui/icons-material";
import { Box, Button } from "@mui/material";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    LogoSpeedDial,
    ScrollBox,
    WidgetContainer,
    WidgetHeader,
} from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorerSlice";
import { getFilePathFromObjectPath } from "utils/objectData";
import { ClippedFile, ClippedObject } from "./clippedObject";
import { VecRGB } from "utils/color";
import { iterateAsync } from "utils/search";
import { clippingOutlineActions, selectOutlineGroups } from "./clippingOutlineSlice";

export default function ClippingOutline() {
    const {
        state: { view, db },
    } = useExplorerGlobals(true);
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.clippingOutline.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.clippingOutline.key);

    const clippedFiles = useAppSelector(selectOutlineGroups);
    const dispatch = useAppDispatch();

    const updateClippedFiles = useCallback(async () => {
        const getFileId = async (fileName: string) => {
            const iterator = db.search({ parentPath: fileName }, undefined);
            const [nodes] = await iterateAsync({ iterator, count: 100000 });
            const ids: number[] = [];
            for (const node of nodes) {
                ids.push(node.id);
            }
            return ids;
        };

        const objIds = await view.getOutlineObjectsOnScreen();
        if (objIds) {
            const filePaths = new Set<string>();
            for (const obj of objIds) {
                const data = await db.getObjectMetdata(obj);
                const f = getFilePathFromObjectPath(data.path);
                if (f) {
                    filePaths.add(f);
                }
            }
            const files: ClippedFile[] = [];

            function hsl2rgb(h: number, s: number, l: number) {
                let a = s * Math.min(l, 1 - l);
                let f = (n: number, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                return [f(0), f(8), f(4)];
            }
            let i = 0;
            const increments = 360 / filePaths.size;
            for (const f of filePaths) {
                const ids = await getFileId(f);
                files.push({ name: f, color: hsl2rgb(increments * i, 1, 0.5) as VecRGB, hidden: false, ids });
                ++i;
            }
            dispatch(clippingOutlineActions.setOutlineGroups(files));
        }
    }, [view, db, dispatch]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.clippingOutline} disableShadow={menuOpen}>
                    {!menuOpen && !minimized ? <></> : null}
                </WidgetHeader>
                <ScrollBox p={1} pb={3} display={menuOpen || minimized ? "none" : "block"}>
                    <Accordion>
                        <AccordionSummary>Clipped objects</AccordionSummary>
                        <AccordionDetails>
                            <Box p={1} display="flex" alignItems="start" flexDirection="column">
                                <Button onClick={() => updateClippedFiles()} color="grey">
                                    <SyncAlt sx={{ mr: 1 }} />
                                    Update
                                </Button>

                                {clippedFiles.map((f, idx) => {
                                    return <ClippedObject file={f} key={idx} />;
                                })}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.clippingOutline.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
