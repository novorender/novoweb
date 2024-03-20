import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app";
import { StorageKey } from "config/storage";
import { selectConfig } from "slices/explorer";
import { AsyncStatus } from "types/misc";
import { deleteFromStorage } from "utils/storage";

import { useRefreshTokensMutation } from "../api";
import { selectXsiteManageRefreshToken, xsiteManageActions } from "../slice";

export function useHandleXsiteManageKeepAlive() {
    const dispatch = useAppDispatch();
    const refreshToken = useAppSelector(selectXsiteManageRefreshToken);
    const config = useAppSelector(selectConfig);
    const [refreshTokens] = useRefreshTokensMutation();
    const intervalId = useRef<number>();

    useEffect(() => {
        if (!refreshToken) {
            if (intervalId.current !== undefined) {
                window.clearTimeout(intervalId.current);
                intervalId.current = undefined;
            }

            return;
        }

        if (intervalId.current !== undefined) {
            return;
        }

        intervalId.current = window.setInterval(async () => {
            const res = await refreshTokens({ refreshToken: refreshToken.token, config });

            if ("data" in res) {
                dispatch(xsiteManageActions.setAccessToken({ status: AsyncStatus.Success, data: res.data.id_token }));
            } else {
                console.warn(res.error);
                deleteFromStorage(StorageKey.XsiteManageRefreshToken);
                dispatch(xsiteManageActions.setRefreshToken(undefined));
                dispatch(xsiteManageActions.setAccessToken({ status: AsyncStatus.Initial }));
            }
        }, refreshToken.refreshIn * 0.9 * 1000);

        return () => {
            window.clearTimeout(intervalId.current);
            intervalId.current = undefined;
        };
    }, [refreshToken, dispatch, refreshTokens, config]);

    return;
}
