import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app";
import { StorageKey } from "config/storage";
import { selectConfig } from "slices/explorer";
import { AsyncStatus } from "types/misc";
import { deleteFromStorage, saveToStorage } from "utils/storage";

import { useLazyRefreshTokensQuery } from "./jiraApi";
import { jiraActions, selectJiraRefreshToken } from "./jiraSlice";

export function useHandleJiraKeepAlive() {
    const dispatch = useAppDispatch();
    const refreshToken = useAppSelector(selectJiraRefreshToken);
    const config = useAppSelector(selectConfig);
    const [refreshTokens] = useLazyRefreshTokensQuery();
    const timeoutId = useRef<number>();

    useEffect(() => {
        if (!refreshToken) {
            if (timeoutId.current !== undefined) {
                window.clearTimeout(timeoutId.current);
                timeoutId.current = undefined;
            }

            return;
        }

        if (timeoutId.current !== undefined) {
            return;
        }

        timeoutId.current = window.setTimeout(async () => {
            const res = await refreshTokens({ refreshToken: refreshToken.token, config })
                .unwrap()
                .catch((error) => console.warn(error));

            if (res) {
                saveToStorage(StorageKey.JiraRefreshToken, res.refresh_token);
                dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Success, data: res.access_token }));
                dispatch(jiraActions.setRefreshToken({ token: res.refresh_token, refreshIn: res.expires_in }));
            } else {
                console.warn("An error occurred while refreshing jira token.");
                deleteFromStorage(StorageKey.JiraRefreshToken);
                dispatch(jiraActions.setRefreshToken(undefined));
                dispatch(jiraActions.setAccessToken({ status: AsyncStatus.Initial }));
            }
        }, refreshToken.refreshIn * 0.9 * 1000);

        return () => {
            window.clearTimeout(timeoutId.current);
            timeoutId.current = undefined;
        };
    }, [refreshToken, dispatch, refreshTokens, config]);

    return;
}
