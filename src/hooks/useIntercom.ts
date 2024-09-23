import Intercom, { shutdown } from "@intercom/messenger-js-sdk";
import { useMediaQuery, useTheme } from "@mui/material";
import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect, useRef } from "react";

import { useGetIntercomConfigQuery } from "apis/dataV2/dataV2Api";
import { useAppSelector } from "app/redux-store-interactions";
import { selectUser } from "slices/authSlice";
import { selectNewDesign } from "slices/explorer";

export function useIntercom() {
    const user = useAppSelector(selectUser);
    const newDesign = useAppSelector(selectNewDesign);
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
    const hidden = window.innerWidth < 1024;
    const mounted = useRef(false);

    const { data: serverConfig } = useGetIntercomConfigQuery(user && !hidden ? undefined : skipToken);

    useEffect(() => {
        if (user && !hidden && serverConfig) {
            Intercom({
                app_id: serverConfig.appId,
                region: "eu",
                user_id: user.user,
                user_hash: serverConfig.hash,
                name: user.name,
                company: user.organization,
                alignment: "left",
                horizontal_padding: isSmall ? 70 : newDesign ? 20 : 80,
                vertical_padding: isSmall ? 12 : 20,
            });
            mounted.current = true;
        }

        if (mounted.current && hidden) {
            shutdown();
        }
    }, [user, newDesign, hidden, isSmall, serverConfig]);
}
