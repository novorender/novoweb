import { OpenInNew } from "@mui/icons-material";
import { useTheme } from "@mui/material";
import { Box, Link, Table, TableBody, TableCell, TableRow } from "@mui/material";

import { useAppSelector } from "app/store";
import { selectArcgisSelectedFeatureInfo } from "features/arcgis/arcgisSlice";
import { trimRightSlash } from "features/arcgis/utils";

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

    if (!featureInfo) {
        return (
            <Box textAlign="center" m={2}>
                Select feature to see the attributes
            </Box>
        );
    }

    const attrList = Object.entries(featureInfo.attributes).sort((kv1, kv2) => kv1[0].localeCompare(kv2[0]));

    if (attrList.length === 0) {
        return (
            <Box textAlign="center" m={2}>
                Selected object doesn't have attributes
            </Box>
        );
    }

    const url = trimRightSlash(featureInfo.featureServerConfig.url);

    return (
        <>
            <Box m={2} display="flex" alignItems="center" gap={1}>
                {featureInfo.featureServerConfig.name}
                <Link href={url} target="_blank">
                    <OpenInNew />
                </Link>
            </Box>
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
        </>
    );
}
