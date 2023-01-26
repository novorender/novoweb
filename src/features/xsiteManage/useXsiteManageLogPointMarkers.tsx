import { useAppDispatch, useAppSelector } from "app/store";
import { useEffect, useState } from "react";

import { useGetAllLogPointsQuery } from "./api";
import {
    LogPointTime,
    selectXsiteManageActiveLogPoints,
    selectXsiteManageCurrentMachine,
    selectXsiteManageIncludedLogPointCodes,
    selectXsiteManageSite,
    xsiteManageActions,
} from "./slice";
import { LogPoint } from "./types";

const empty = [] as LogPoint[];

export function useXsiteManageLogPointMarkers() {
    const site = useAppSelector(selectXsiteManageSite);
    const activeLogPoints = useAppSelector(selectXsiteManageActiveLogPoints);
    const currentMachine = useAppSelector(selectXsiteManageCurrentMachine);
    const includedLogPointCodes = useAppSelector(selectXsiteManageIncludedLogPointCodes);
    const dispatch = useAppDispatch();

    const [pts, setPts] = useState(empty);

    const { data: logPointData, isFetching } = useGetAllLogPointsQuery(site?.siteId ?? "", {
        skip: !site?.siteId || !currentMachine || activeLogPoints === LogPointTime.None,
    });

    useEffect(() => {
        dispatch(xsiteManageActions.setIsFetchingLogPoints(isFetching));
    }, [dispatch, isFetching]);

    useEffect(() => {
        if (!logPointData || !currentMachine || activeLogPoints === LogPointTime.None) {
            setPts(empty);
            return;
        }

        if (activeLogPoints === LogPointTime.All) {
            setPts(
                logPointData.filter(
                    (lpt) =>
                        lpt.machineId === currentMachine &&
                        (includedLogPointCodes.length ? lpt.code && includedLogPointCodes.includes(lpt.code) : true)
                )
            );
            return;
        }

        const date = new Date();

        switch (activeLogPoints) {
            case LogPointTime.Day:
                date.setDate(date.getDate() - 1);
                break;
            case LogPointTime.Week:
                date.setDate(date.getDate() - 7);
                break;
            case LogPointTime.Month:
                date.setDate(date.getDate() - 30);
                break;
        }

        setPts(
            logPointData.filter(
                (lpt) =>
                    lpt.machineId === currentMachine &&
                    lpt.timestampMs >= date.getTime() &&
                    (includedLogPointCodes.length ? lpt.code && includedLogPointCodes.includes(lpt.code) : true)
            )
        );
    }, [logPointData, activeLogPoints, currentMachine, includedLogPointCodes]);

    return pts;
}
