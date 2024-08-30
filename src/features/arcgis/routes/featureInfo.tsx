import { OpenInNew } from "@mui/icons-material";
import { LinearProgress, useTheme } from "@mui/material";
import { Box, Link, Table, TableBody, TableCell, TableRow } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "app/redux-store-interactions";
import { ScrollBox } from "components";
import { selectArcgisSelectedFeatureInfo } from "features/arcgis/arcgisSlice";

import { useQueryLayerQuery } from "../arcgisApi";

export default function FeatureInfo() {
    const theme = useTheme();

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
            <Box flexDirection="column" flexGrow={1} overflow="hidden">
                <AttrList />
            </Box>
        </>
    );
}

function AttrList() {
    const { t } = useTranslation();
    const featureInfo = useAppSelector(selectArcgisSelectedFeatureInfo);
    const { data: layerQueryResp, isFetching } = useQueryLayerQuery(
        {
            featureServerUrl: featureInfo?.featureServer.url ?? "",
            layerId: featureInfo?.layer.id ?? 0,
            params: {
                where: "1=1",
                outFields: "*",
                objectIds: featureInfo?.featureId,
                returnGeometry: false,
            },
        },
        { skip: !featureInfo },
    );

    if (!featureInfo) {
        return (
            <Box textAlign="center" m={2}>
                {t("selectFeatureToSeeTheAttributes")}
            </Box>
        );
    }

    if (isFetching) {
        return (
            <Box>
                <LinearProgress />
            </Box>
        );
    }

    const attrs = layerQueryResp?.features[0]?.attributes;

    if (!attrs) {
        return (
            <Box textAlign="center" m={2}>
                {t("selectedFeatureNotFound")}
            </Box>
        );
    }

    const attrList = attrs && Object.entries(attrs).sort((kv1, kv2) => kv1[0].localeCompare(kv2[0]));

    if (attrList.length === 0) {
        return (
            <Box textAlign="center" m={2}>
                {t("selectedObjectDoesn'THaveAttributes")}
            </Box>
        );
    }

    const url = featureInfo.featureServer.url;

    return (
        <>
            <Box m={2} display="flex" alignItems="center" gap={1}>
                {featureInfo.featureServer.name}
                <Link href={url} target="_blank">
                    <OpenInNew />
                </Link>
            </Box>

            <ScrollBox display="flex" flexDirection="column" height={1} pt={1} pb={2}>
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell>{t("layer")}</TableCell>
                            <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                    {featureInfo.layer.name}
                                    <Link href={`${url}/${featureInfo.layer.id}`} target="_blank">
                                        <OpenInNew />
                                    </Link>
                                </Box>
                            </TableCell>
                        </TableRow>
                        {attrList.map(([propName, value]) => (
                            <TableRow key={propName}>
                                <TableCell>{propName}</TableCell>
                                <TableCell>{value}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollBox>
        </>
    );
}
