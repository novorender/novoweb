import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { StorageKey } from "config/storage";
import { AsyncStatus } from "types/misc";
import { deleteFromStorage, saveToStorage } from "utils/storage";

import { useRefreshTokensMutation } from "./jiraApi";
import { jiraActions, selectJiraRefreshToken } from "./jiraSlice";

export function useHandleJiraKeepAlive() {
    const dispatch = useAppDispatch();
    const refreshToken = useAppSelector(selectJiraRefreshToken);
    const [refreshTokens] = useRefreshTokensMutation();
    const timeoutId = useRef<number>();

    useEffect(() => {
        if (!refreshToken || timeoutId.current !== undefined) {
            return;
        }

        timeoutId.current = window.setTimeout(async () => {
            const res = await refreshTokens({ refreshToken: refreshToken.token });

            if ("data" in res) {
                saveToStorage(StorageKey.JiraRefreshToken, res.data.refresh_token);
                dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Success, data: res.data.access_token }));
                dispatch(
                    jiraActions.setRefreshToken({ token: res.data.refresh_token, refreshIn: res.data.expires_in })
                );
            } else {
                console.warn(res.error);
                deleteFromStorage(StorageKey.JiraRefreshToken);
                dispatch(jiraActions.setRefreshToken(undefined));
                dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Initial }));
            }
        }, refreshToken.refreshIn * 0.9 * 1000);

        return () => {
            window.clearTimeout(timeoutId.current);
            timeoutId.current = undefined;
        };
    }, [refreshToken, dispatch, refreshTokens]);

    return;
}
