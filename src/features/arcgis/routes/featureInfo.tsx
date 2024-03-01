import { OpenInNew } from "@mui/icons-material";
import { LinearProgress, useTheme } from "@mui/material";
import { Box, Link, Table, TableBody, TableCell, TableRow } from "@mui/material";

import { useAppSelector } from "app/store";
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
        { skip: !featureInfo }
    );

    if (!featureInfo) {
        return (
            <Box textAlign="center" m={2}>
                Select feature to see the attributes
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
                Selected feature not found
            </Box>
        );
    }

    const attrList = attrs && Object.entries(attrs).sort((kv1, kv2) => kv1[0].localeCompare(kv2[0]));

    if (attrList.length === 0) {
        return (
            <Box textAlign="center" m={2}>
                Selected object doesn't have attributes
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
                            <TableCell>Layer</TableCell>
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
