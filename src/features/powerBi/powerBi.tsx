import { useCallback, useEffect, useState } from "react";
import { PowerBIEmbed } from "powerbi-client-react";
import { service, models, Report } from "powerbi-client";
import { styled } from "@mui/material";
import { css } from "@mui/styled-engine";
import type { Scene, View } from "@novorender/webgl-api";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useAppDispatch } from "app/store";
import { renderActions } from "slices/renderSlice";

type DataSelectedEvent = service.ICustomEvent<models.ISelection>;

const reportConfig: models.IReportEmbedConfiguration = {
    type: "report",
    id: "6174fd2d-ce49-405d-961a-80543d904e5e",
    // accessToken expires after approx. an hour
    // @powershell Get-PowerBIAccessToken -asString
    accessToken: process.env.REACT_APP_PBI_ACCESS_TOKEN,
    tokenType: models.TokenType.Aad,
    settings: {
        filterPaneEnabled: false,
        navContentPaneEnabled: false,
    },
};

const PowerBiContainer = styled("div")(
    ({ theme }) => css`
        position: absolute;
        width: 50%;
        height: 54%;
        top: 0;
        right: 0;
        background: ${theme.palette.common.white};
        border: 0;

        & > div {
            height: 100%;
            width: 100%;
        }

        iframe {
            border: 0;
            width: 100%;
            height: 100%;
        }
    `
);

export function PowerBi({ scene, view }: { scene: Scene; view: View }) {
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatch = useAppDispatch();

    const [report, setReport] = useState<Report>();
    const [events, setEvents] = useState<service.ICustomEvent<{}>[]>([]);

    const getRenderedColumnIds = useCallback(async () => {
        const page = report ? (await report.getPages()).find((page) => page.isActive) : undefined;
        const visual = page
            ? (await page.getVisuals()).find((visual) => visual.name === "d7c6f821e2d5903ad41b")
            : undefined;
        const data = visual ? (await visual.exportData()).data : undefined;
        const ids = data ? parseExportData(data) : undefined;

        if (!ids) {
            return;
        }

        dispatch(renderActions.setMainObject(ids[0]));
        dispatchHighlighted(highlightActions.setIds(ids));
    }, [report, dispatchHighlighted, dispatch]);

    useEffect(() => {
        if (!events.length) {
            return;
        }

        if (events.length === 1 && events[0].type === "rendered") {
            setEvents([]);
            return;
        }

        const dataSelectedEvent = events.find((event) => event.type === "dataSelected");
        const selectedObjectId = dataSelectedEvent
            ? getSelectedObjectId(dataSelectedEvent as DataSelectedEvent)
            : undefined;

        if (selectedObjectId) {
            zoomTo(scene, view, selectedObjectId);
            dispatch(renderActions.setMainObject(selectedObjectId));
            setEvents([]);
        } else if (events.find((event) => event.type === "rendered")) {
            getRenderedColumnIds();
            setEvents([]);
        }
    }, [scene, view, events, getRenderedColumnIds, dispatch]);

    const eventHandlers = new Map([
        [
            "error",
            function (event?: service.ICustomEvent<unknown>) {
                console.error({ event });
            },
        ],
        [
            "rendered",
            function (event?: service.ICustomEvent<{}>) {
                if (!event) {
                    return;
                }

                setEvents((events) => [...events, event]);
            },
        ],
        [
            "dataSelected",
            function (event?: DataSelectedEvent) {
                if (!event) {
                    return;
                }

                setEvents((events) => [...events, event]);
            },
        ],
    ]);

    return (
        <PowerBiContainer>
            <PowerBIEmbed
                getEmbeddedComponent={(embedded) => {
                    setReport(embedded as Report);
                }}
                embedConfig={reportConfig}
                eventHandlers={eventHandlers}
            />
        </PowerBiContainer>
    );
}

function getSelectedObjectId(event: DataSelectedEvent): number | undefined {
    if (event.detail.dataPoints.length !== 1) {
        return;
    }

    const dp = event.detail.dataPoints[0];
    const identity = dp
        ? dp.identity.find((identity) => models.isColumn(identity.target) && identity.target.column === "Column1.id")
        : undefined;
    return identity ? Number(identity.equals) : undefined;
}

function parseExportData(data: string) {
    return (data.match(/^[\d]+/gm) ?? [])
        .map((value) => Number(value))
        .filter((number) => number && !Number.isNaN(number));
}

async function zoomTo(scene: Scene, view: View, id: number) {
    const meta = await scene.getObjectReference(id).loadMetaData();
    const bounds = meta.bounds?.sphere;

    if (!bounds) {
        return;
    }

    view.camera.controller.zoomTo(bounds);
}
