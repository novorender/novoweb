import { ArrowBack, LocationOnOutlined } from "@mui/icons-material";
import { Box, Button, Typography, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraType, renderActions } from "features/render";

import { useGetAllLogPointsQuery } from "../api";
import { selectXsiteManageSite } from "../slice";

export function LogPoint() {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const { id } = useParams<{ id?: string }>();
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const dispatch = useAppDispatch();
    const site = useAppSelector(selectXsiteManageSite);

    const { pt, isFetching, isError } = useGetAllLogPointsQuery(site?.siteId ?? "", {
        skip: !site?.siteId,
        selectFromResult: ({ data, isFetching, isError }) => ({
            isFetching,
            isError,
            pt: id ? data?.find((_pt) => _pt.localId === Number(id)) : undefined,
        }),
    });

    const hasPos = pt?.x && pt?.y && pt?.z;

    const handleGoTo = () => {
        if (!hasPos) {
            return;
        }

        dispatch(
            renderActions.setCamera({
                type: CameraType.Pinhole,
                goTo: {
                    position: [pt.x, pt.y, pt.z],
                    rotation: view.renderState.camera.rotation,
                },
            }),
        );
    };

    return isFetching ? (
        <Box position="relative">
            <LinearProgress />
        </Box>
    ) : (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <Button onClick={() => history.push("/log-points")} color="grey">
                            <ArrowBack sx={{ mr: 1 }} />
                            {t("back")}
                        </Button>
                        {hasPos ? (
                            <Button onClick={handleGoTo} color="grey">
                                <LocationOnOutlined sx={{ mr: 1 }} />
                                {t("goTo")}
                            </Button>
                        ) : null}
                    </Box>
                </>
            </Box>
            <ScrollBox p={1} pt={2} pb={2}>
                {isError || !pt ? (
                    <Typography>
                        {t("failedToLoadDataFrom", { name: t(featuresConfig.xsiteManage.nameKey) })}
                    </Typography>
                ) : (
                    <>
                        <Box mb={1}>{pt.code}</Box>
                    </>
                )}
            </ScrollBox>
        </>
    );
}
