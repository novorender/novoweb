import { ArrowBack, Save } from "@mui/icons-material";
import {
    Autocomplete,
    Box,
    Button,
    CircularProgress,
    createFilterOptions,
    Link,
    Typography,
    useTheme,
} from "@mui/material";
import { skipToken } from "@reduxjs/toolkit/query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { dataApi } from "apis/dataV1";
import { useGetProjectQuery, useSearchEpsgQuery } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox, TextField } from "components";
import { renderActions, selectProjectSettings, selectSceneOrganization } from "features/render/renderSlice";
import { useSceneId } from "hooks/useSceneId";
import { selectConfig, selectProjectIsV2 } from "slices/explorer";
import { projectV1ZoneNameToEpsg } from "utils/misc";

const filter = createFilterOptions<Option>();

type Option = {
    zone: string;
    epsg: string;
};

export function ProjectSettings({ save, saving }: { save: () => Promise<void>; saving: boolean }) {
    const { t } = useTranslation();
    const history = useHistory();
    const theme = useTheme();
    const isV2 = useAppSelector(selectProjectIsV2);
    const projectsUrl = useAppSelector(selectConfig).projectsUrl;

    const settings = useAppSelector(selectProjectSettings);
    const dispatch = useAppDispatch();
    const projectId = useSceneId();
    const org = useAppSelector(selectSceneOrganization);

    const projectV2 = useGetProjectQuery(projectId && isV2 ? { projectId } : skipToken, {
        refetchOnFocus: true,
    });
    const epsgSearchResult = useSearchEpsgQuery(projectV2.data?.epsg ? { query: projectV2.data.epsg } : skipToken);
    const epsg = epsgSearchResult.data?.results[0];

    const wkZones = useMemo(
        () =>
            dataApi.getWKZones().map(
                (zone) =>
                    ({
                        zone,
                        epsg: projectV1ZoneNameToEpsg(zone),
                    }) as Option,
            ),
        [],
    );

    let options: Option[];
    let value: Option | undefined;
    if (isV2) {
        options = epsg ? [{ zone: epsg.name, epsg: epsg.id }] : [];
        value = options[0];
    } else {
        options = wkZones;
        value = settings.tmZone ? wkZones.find((z) => z.zone === settings.tmZone) : undefined;
    }

    const loading = isV2 && (projectV2.isFetching || epsgSearchResult.isFetching);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => history.goBack()} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                    <Button sx={{ ml: "auto" }} onClick={() => save()} color="grey" disabled={saving || isV2}>
                        <Save sx={{ mr: 1 }} />
                        {t("save")}
                    </Button>
                </Box>
            </Box>
            {saving ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox height={1} px={1} mt={1} pb={3}>
                <Typography pt={1} variant="h6" fontWeight={600}>
                    {t("projectSettings")}
                </Typography>
                <Divider sx={{ my: 1, mb: 2 }} />
                <Autocomplete
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                    options={options}
                    value={value || null}
                    onChange={(_event, newValue) => {
                        if (newValue) {
                            dispatch(renderActions.setProject({ tmZone: newValue.zone }));
                        }
                    }}
                    disabled={isV2}
                    loading={loading}
                    filterOptions={filter}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="TM Zone"
                            helperText={
                                isV2 ? (
                                    <>
                                        {t("editTimezoneIn")}{" "}
                                        <Link
                                            href={`${projectsUrl}/org/${org}?modalContext=edit&projectId=${projectId}`}
                                            target="_blank"
                                        >
                                            {t("projects")}
                                        </Link>
                                    </>
                                ) : null
                            }
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                    getOptionLabel={(option) => `${option.zone} (EPSG: ${option.epsg})`}
                    ListboxProps={{ style: { maxHeight: "200px" } }}
                />
            </ScrollBox>
        </>
    );
}
