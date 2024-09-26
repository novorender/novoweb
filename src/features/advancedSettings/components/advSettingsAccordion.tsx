import { AccordionProps } from "@mui/material";
import { SyntheticEvent, useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Accordion } from "components";
import { explorerActions, selectHighlightSetting } from "slices/explorer";
import { sleep } from "utils/time";

export function AdvSettingsAccordion(props: AccordionProps) {
    const [expanded, setExpanded] = useState(false);
    const highlightSetting = useAppSelector(selectHighlightSetting);
    const dispatch = useAppDispatch();
    const history = useHistory();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const id = props.id;

    useEffect(() => {
        highlight();

        async function highlight() {
            if (!highlightSetting || highlightSetting.accordion !== id) {
                return;
            }

            dispatch(explorerActions.setHighlightSetting(undefined));

            if (!expanded) {
                setExpanded(true);
                await sleep(200);
            }

            const field = containerRef.current?.querySelector(highlightSetting.field) as HTMLElement;
            if (!field) {
                return;
            }

            field.animate([{ background: "unset" }, { background: "rgb(13, 71, 161)" }, { background: "unset" }], {
                duration: 500,
                delay: 200,
            });
            field.scrollIntoView();
        }
    }, [dispatch, highlightSetting, history, id, expanded]);

    const handleChange = (_e: SyntheticEvent, newExpanded: boolean) => {
        setExpanded(newExpanded);
    };

    return <Accordion {...props} expanded={expanded} onChange={handleChange} ref={containerRef} />;
}
