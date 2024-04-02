import { Add, ArrowBack, CheckBox, CheckBoxOutlineBlank, InfoOutlined, Save } from "@mui/icons-material";
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormHelperText,
    IconButton,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    SxProps,
    TextField,
    Theme,
    Tooltip,
    Typography,
    useTheme,
} from "@mui/material";
import { View } from "@novorender/api";
import { ObjectDB } from "@novorender/data-js-api";
import { useCallback, useMemo, useRef } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { isInternalGroup, ObjectGroup, useObjectGroups } from "contexts/objectGroups";
import { areArraysEqual } from "features/arcgis/utils";
import { selectDeviations } from "features/render";
import { selectProjectIsV2 } from "slices/explorer";
import { AsyncStatus } from "types/misc";
import { getObjectData } from "utils/search";

import { CenterLineSection } from "../components/centerLineSection";
import { ColorStopList } from "../components/colorStop";
import { SectionHeader } from "../components/sectionHeader";
import { SubprofileList } from "../components/subprofileList";
import { TunnelInfoSection } from "../components/tunnelInfoSection";
import {
    deviationsActions,
    selectDeviationForm,
    selectDeviationProfileList,
    selectDeviationProfiles,
    selectSaveStatus,
} from "../deviationsSlice";
import {
    CenterLineGroup,
    DeviationForm,
    DeviationType,
    ObjectGroupExt,
    SubprofileGroup,
    TunnelInfoGroup,
    UiDeviationConfig,
    UiDeviationProfile,
} from "../deviationTypes";
import { useSaveDeviationConfig } from "../hooks/useSaveDeviationConfig";
import { makeLegendGroups } from "../useHandleDeviations";
import {
    DELETED_DEVIATION_LABEL,
    NEW_DEVIATION_ID,
    newDeviationForm,
    newDeviationSubprofile,
    profileToDeviationForm,
} from "../utils";
import {
    getActiveErrorText,
    hasActiveErrors,
    hasErrors,
    isActiveError,
    touchFormField,
    updateFormField,
    validateDeviationForm,
} from "../validation";

export function Deviation() {
    const {
        state: { view, db },
    } = useExplorerGlobals();
    const isProjectV2 = useAppSelector(selectProjectIsV2);
    const theme = useTheme();
    const history = useHistory();
    const profiles = useAppSelector(selectDeviationProfiles);
    const profileList = useAppSelector(selectDeviationProfileList);
    const dispatch = useAppDispatch();
    const saveStatus = useAppSelector(selectSaveStatus);
    const objectGroups = useObjectGroups().filter((grp) => !isInternalGroup(grp));
    const saveConfig = useSaveDeviationConfig();
    const deviations = useAppSelector(selectDeviations);
    const containerRef = useRef<HTMLElement>();

    const deviationForm = useAppSelector(selectDeviationForm) ?? newDeviationForm();
    const subprofile = deviationForm.subprofiles[deviationForm.subprofileIndex];

    const update = useCallback(
        (upd: Partial<DeviationForm>) => {
            dispatch(deviationsActions.setDeviationForm({ ...deviationForm, ...upd }));
        },
        [dispatch, deviationForm]
    );
    const updateSubprofile = useCallback(
        (upd: Partial<SubprofileGroup>) => {
            const subprofiles = deviationForm.subprofiles.slice();
            subprofiles[deviationForm.subprofileIndex] = { ...subprofiles[deviationForm.subprofileIndex], ...upd };
            dispatch(deviationsActions.setDeviationForm({ ...deviationForm, subprofiles }));
        },
        [dispatch, deviationForm]
    );
    const updateCenterLine = useCallback(
        (centerLine: CenterLineGroup) => updateSubprofile({ centerLine }),
        [updateSubprofile]
    );
    const updateTunnelInfo = useCallback(
        (tunnelInfo: TunnelInfoGroup) => updateSubprofile({ tunnelInfo }),
        [updateSubprofile]
    );

    const otherNames = useMemo(
        () => profileList.filter((p) => p.id !== deviationForm.id).map((p) => p.name.toLowerCase()),
        [profileList, deviationForm.id]
    );
    const errors = validateDeviationForm(deviationForm, otherNames, objectGroups);
    const subprofileErrors = errors.subprofiles[deviationForm.subprofileIndex];

    const formDisabled = !isProjectV2;

    const groups1 = useMemo(
        () => selectGroupsForIds(objectGroups, subprofile.groups1.value),
        [subprofile.groups1.value, objectGroups]
    );
    const groups2 = useMemo(
        () => selectGroupsForIds(objectGroups, subprofile.groups2.value),
        [subprofile.groups2.value, objectGroups]
    );
    const deviationFavorites = useMemo(
        () => selectGroupsForIds(objectGroups, subprofile.favorites.value),
        [subprofile.favorites.value, objectGroups]
    );

    const groups1Options = useMemo(
        () => [...objectGroups.filter((g) => !groups2.includes(g)), ...groups1.filter((g) => g.deleted)],
        [objectGroups, groups1, groups2]
    );
    const groups2Options = useMemo(
        () => [...objectGroups.filter((g) => !groups1.includes(g)), ...groups2.filter((g) => g.deleted)],
        [objectGroups, groups1, groups2]
    );
    const favoriteOptions = useMemo(
        () => [...objectGroups, ...deviationFavorites.filter((g) => g.deleted)],
        [objectGroups, deviationFavorites]
    );

    const handleSave = () => {
        save();

        async function save() {
            if (profiles.status !== AsyncStatus.Success || !db || !view) {
                return;
            }

            if (hasErrors(errors)) {
                update({
                    name: touchFormField(deviationForm.name),
                    colorSetup: {
                        ...deviationForm.colorSetup,
                        colorStops: touchFormField(deviationForm.colorSetup.colorStops),
                    },
                    subprofiles: errors.subprofiles.map((_sp, i) => ({
                        ...deviationForm.subprofiles[i],
                        favorites: touchFormField(subprofile.favorites),
                        groups1: touchFormField(subprofile.groups1),
                        groups2: touchFormField(subprofile.groups2),
                    })),
                });

                setTimeout(() => {
                    const errorNode = containerRef.current?.querySelector(".Mui-error");
                    if (errorNode) {
                        errorNode.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                }, 200);

                return;
            }

            dispatch(deviationsActions.setSaveStatus({ status: AsyncStatus.Loading }));
            try {
                const profile = await deviationFormToProfile({
                    db,
                    view,
                    deviationForm: deviationForm,
                });
                const isNew = deviationForm.id === NEW_DEVIATION_ID;
                if (isNew) {
                    profile.id = window.crypto.randomUUID();
                }
                const newProfileData = mergeDeviationFormIntoProfiles(profiles.data, profile);

                await saveConfig({
                    uiConfig: newProfileData,
                    deviations: {
                        ...deviations,
                        colorGradient: {
                            knots: profile.colors.colorStops,
                        },
                    },
                    showRebuildMessage: newProfileData.rebuildRequired,
                });

                dispatch(deviationsActions.setProfiles({ status: AsyncStatus.Success, data: newProfileData }));

                history.goBack();

                dispatch(deviationsActions.setDeviationForm(undefined));
            } catch (ex) {
                console.warn(ex);
                dispatch(
                    deviationsActions.setSaveStatus({
                        status: AsyncStatus.Error,
                        msg: "Failed to save deviation profile",
                    })
                );
            }
        }
    };

    const loading = saveStatus.status === AsyncStatus.Loading;

    const canSave = !formDisabled && saveStatus.status !== AsyncStatus.Loading && !hasActiveErrors(errors);

    const showSubprofileSubheader = deviationForm.subprofiles.length > 1;

    return (
        <>
            <Box boxShadow={showSubprofileSubheader ? undefined : theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button
                        color="grey"
                        onClick={() => {
                            history.goBack();
                            dispatch(deviationsActions.setDeviationForm(undefined));
                        }}
                    >
                        <ArrowBack fontSize="small" sx={{ mr: 1 }} />
                        Back
                    </Button>
                    <Button color="grey" onClick={handleSave} disabled={!canSave}>
                        <Save fontSize="small" sx={{ mr: 1 }} />
                        Save
                    </Button>
                </Box>
            </Box>

            {showSubprofileSubheader && (
                <Box boxShadow={theme.customShadows.widgetHeader}>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box px={1}>
                        <FormHelperText>
                            Editing {groups1.map((g) => g.name).join(", ") || "[not set]"}
                            <Box component="span" fontWeight={600}>
                                {" vs "}
                            </Box>
                            {groups2.map((g) => g.name).join(", ") || "[not set]"}...
                        </FormHelperText>
                    </Box>
                </Box>
            )}

            {loading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox height={1} p={2} ref={containerRef}>
                <Typography fontWeight={600} fontSize="1.5rem" mb={2}>
                    Create deviation profile
                </Typography>
                <FormControl fullWidth>
                    <InputLabel id="select-profile-to-copy-from-label">
                        Copy from existing profile (optional)
                    </InputLabel>
                    <Select
                        labelId="select-profile-to-copy-from-label"
                        id="select-profile-to-copy-from"
                        value={deviationForm.copyFromProfileId.value ?? ""}
                        label="Copy from existing profile (optional)"
                        onChange={(e) => {
                            const source = profileList.find((p) => p.id === e.target.value)!;
                            const newForm = copyProfile(profileList, source);
                            update(newForm);
                        }}
                        disabled={formDisabled}
                    >
                        {profileList.map((profile, idx) => (
                            <MenuItem key={profile.id} value={profile.id}>
                                {profile.name ?? `Deviation ${idx + 1}`}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <TextField
                    fullWidth
                    value={deviationForm.name.value}
                    onChange={(e) => {
                        update({ name: updateFormField(e.target.value) });
                    }}
                    label="Name of the deviation profile"
                    error={isActiveError(errors.name)}
                    helperText={getActiveErrorText(errors.name)}
                    sx={{ mt: 2 }}
                    disabled={formDisabled}
                />

                {deviationForm.subprofiles.length > 1 && (
                    <>
                        <SectionHeader>Subprofiles</SectionHeader>
                        <Box>
                            <SubprofileList
                                subprofiles={deviationForm.subprofiles}
                                errors={errors.subprofiles}
                                selectedIndex={deviationForm.subprofileIndex}
                                objectGroups={objectGroups}
                                onClick={(sp, i) =>
                                    update({
                                        subprofileIndex: i,
                                    })
                                }
                                onDelete={(sp, index) => {
                                    update({
                                        subprofiles: deviationForm.subprofiles.filter((_, i) => index !== i),
                                        subprofileIndex:
                                            deviationForm.subprofileIndex < deviationForm.subprofiles.length - 1
                                                ? deviationForm.subprofileIndex
                                                : deviationForm.subprofileIndex - 1,
                                    });
                                }}
                            />
                        </Box>
                    </>
                )}

                <SectionHeader>Select deviation Groups</SectionHeader>
                <Typography>
                    Create deviations between items in Groups. For example a point cloud and (many) 3D asset(s).
                </Typography>
                <GroupAutocomplete
                    options={groups1Options}
                    label="Groups to analyse"
                    onChange={(groups) => updateSubprofile({ groups1: updateFormField(groups.map((g) => g.id)) })}
                    selected={groups1}
                    sx={{ mt: 2 }}
                    error={isActiveError(subprofileErrors.groups1)}
                    helperText={getActiveErrorText(subprofileErrors.groups1)}
                    disabled={formDisabled}
                />
                <Box display="flex" justifyContent="center" mt={1}>
                    <Typography fontWeight={600}>vs</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <FormControl>
                        <RadioGroup
                            row
                            aria-labelledby="select-deviation-type-label"
                            name="select-deviation-type"
                            value={deviationForm.deviationType.value}
                            onChange={(e) => {
                                update({
                                    deviationType: updateFormField(Number(e.target.value)),
                                });
                            }}
                        >
                            <FormControlLabel
                                value={DeviationType.PointToTriangle}
                                control={<Radio />}
                                label="Mesh"
                                disabled={formDisabled}
                            />
                            <FormControlLabel
                                value={DeviationType.PointToPoint}
                                control={<Radio />}
                                label="Point"
                                disabled={formDisabled}
                            />
                        </RadioGroup>
                    </FormControl>
                    {!deviationForm.hasFromAndTo && (
                        <Tooltip
                            title="Deviation profile was created in the older version, where only one set of groups needed to be specified."
                            enterDelay={0}
                        >
                            <IconButton
                                onClick={(evt) => {
                                    evt.stopPropagation();
                                }}
                            >
                                <InfoOutlined />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
                <GroupAutocomplete
                    options={groups2Options}
                    label="Analyse against"
                    onChange={(groups) => updateSubprofile({ groups2: updateFormField(groups.map((g) => g.id)) })}
                    selected={groups2}
                    sx={{ mt: 1 }}
                    error={isActiveError(subprofileErrors.groups2)}
                    helperText={getActiveErrorText(subprofileErrors.groups2)}
                    disabled={formDisabled}
                />
                <SectionHeader>Select groups to appear in legend</SectionHeader>
                <GroupAutocomplete
                    options={favoriteOptions}
                    label="Groups"
                    onChange={(groups) => updateSubprofile({ favorites: updateFormField(groups.map((g) => g.id)) })}
                    selected={deviationFavorites}
                    sx={{ mt: 2 }}
                    error={isActiveError(subprofileErrors.favorites)}
                    helperText={getActiveErrorText(subprofileErrors.favorites)}
                    disabled={formDisabled}
                />
                <SectionHeader>Deviation parameters</SectionHeader>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={deviationForm.colorSetup.absoluteValues}
                            onChange={(e) =>
                                update({
                                    colorSetup: { ...deviationForm.colorSetup, absoluteValues: e.target.checked },
                                })
                            }
                            disabled={formDisabled}
                        />
                    }
                    label="Absolute values"
                />
                <ColorStopList
                    colorStops={deviationForm.colorSetup.colorStops.value}
                    onChange={(colorStops) =>
                        update({ colorSetup: { ...deviationForm.colorSetup, colorStops: updateFormField(colorStops) } })
                    }
                    errors={errors}
                    disabled={formDisabled}
                />
                <CenterLineSection
                    centerLine={subprofile.centerLine}
                    onChange={updateCenterLine}
                    disabled={formDisabled}
                />
                {subprofile.centerLine.enabled && (
                    <TunnelInfoSection
                        tunnelInfo={subprofile.tunnelInfo}
                        onChange={updateTunnelInfo}
                        disabled={formDisabled}
                        errors={subprofileErrors}
                    />
                )}

                {!formDisabled && (
                    <Box display="flex" m={2} mt={4} justifyContent="center">
                        <Button
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                            size="large"
                            onClick={() =>
                                update({
                                    subprofiles: [...deviationForm.subprofiles, newDeviationSubprofile()],
                                    subprofileIndex: deviationForm.subprofiles.length,
                                })
                            }
                        >
                            <Add sx={{ mr: 1 }} /> Add subprofile
                        </Button>
                    </Box>
                )}
            </ScrollBox>
        </>
    );
}

const checkboxIcon = <CheckBoxOutlineBlank fontSize="small" />;
const checkboxCheckedIcon = <CheckBox fontSize="small" />;

function GroupAutocomplete({
    options,
    selected,
    label,
    onChange,
    disabled,
    error,
    helperText,
    sx,
}: {
    options: ObjectGroupExt[];
    selected: ObjectGroupExt[];
    label: string;
    onChange: (groups: ObjectGroupExt[]) => void;
    disabled?: boolean;
    error?: boolean;
    helperText?: string;
    sx?: SxProps<Theme>;
}) {
    return (
        <Autocomplete
            multiple
            options={options}
            getOptionLabel={(g) => g.name!}
            fullWidth
            value={selected}
            onChange={(e, value) => onChange(value)}
            renderInput={(params) => <TextField {...params} label={label} error={error} helperText={helperText} />}
            renderOption={(props, option, { selected }) => (
                <li {...props}>
                    <Checkbox
                        icon={checkboxIcon}
                        checkedIcon={checkboxCheckedIcon}
                        style={{ marginRight: 8 }}
                        checked={selected}
                    />
                    {option.name}
                </li>
            )}
            disabled={disabled}
            sx={sx}
            disableCloseOnSelect
            ChipProps={{ color: "primary", variant: "outlined" }}
        />
    );
}

function mergeDeviationFormIntoProfiles(config: UiDeviationConfig, profile: UiDeviationProfile) {
    const list = [...config.profiles];
    const existingIndex = config.profiles.findIndex((p) => p.id === profile.id);

    let rebuildRequired = config.rebuildRequired;
    if (existingIndex !== -1) {
        const existing = list[existingIndex];
        const typeChanged = existing.deviationType !== profile.deviationType;
        rebuildRequired = rebuildRequired || checkIfRebuildIsRequired(existing, profile);
        if (typeChanged) {
            list.slice(existingIndex, 1);
            list.push(profile);
        } else {
            list[existingIndex] = profile;
        }
    } else {
        rebuildRequired = true;
        list.push(profile);
    }

    return {
        ...config,
        rebuildRequired,
        profiles: [
            ...list.filter((p) => p.deviationType === DeviationType.PointToTriangle),
            ...list.filter((p) => p.deviationType === DeviationType.PointToPoint),
        ],
    } as UiDeviationConfig;
}

function copyProfile(profiles: UiDeviationProfile[], source: UiDeviationProfile): DeviationForm {
    return {
        ...profileToDeviationForm(source),
        id: window.crypto.randomUUID(),
        copyFromProfileId: updateFormField(source.id),
        name: updateFormField(nextName(new Set(profiles.map((p) => p.name)), source.name)),
    };
}

function nextName(names: Set<string>, suggestion: string) {
    let i = 1;
    let result: string;
    do {
        result = `${suggestion} ${i++}`;
    } while (names.has(result));
    return result;
}

async function deviationFormToProfile({
    deviationForm,
    db,
    view,
}: {
    db: ObjectDB;
    view: View;
    deviationForm: DeviationForm;
}): Promise<UiDeviationProfile> {
    const uniqueCenterLineIds = new Set(
        deviationForm.subprofiles
            .filter((sp) => sp.centerLine.enabled && sp.centerLine.id.value)
            .map((sp) => sp.centerLine.id.value!)
    );
    const brepIds = new Map<number, string>();
    if (uniqueCenterLineIds.size > 0) {
        await Promise.all(
            [...uniqueCenterLineIds].map(async (id) => {
                const metadata = await getObjectData({ db: db!, view: view!, id });
                if (metadata) {
                    const brepId = metadata.properties.find((p) => p[0] === "Novorender/PathId")?.[1];
                    if (brepId) {
                        brepIds.set(id, brepId);
                    }
                }
            })
        );
    }

    return {
        id: deviationForm.id,
        name: deviationForm.name.value,
        copyFromProfileId: deviationForm.copyFromProfileId.value,
        colors: {
            absoluteValues: deviationForm.colorSetup.absoluteValues,
            colorStops: deviationForm.colorSetup.colorStops.value,
        },
        subprofiles: deviationForm.subprofiles.map((sp) => {
            const brepId = sp.centerLine.id.value ? brepIds.get(sp.centerLine.id.value) : undefined;
            const centerLine =
                sp.centerLine.enabled && brepId
                    ? {
                          brepId,
                          objectId: sp.centerLine.id.value!,
                          parameterBounds: sp.centerLine.parameterBounds.value,
                      }
                    : undefined;

            return {
                centerLine,
                heightToCeiling:
                    centerLine && sp.tunnelInfo.enabled && Number(sp.tunnelInfo.heightToCeiling.value)
                        ? Number(sp.tunnelInfo.heightToCeiling.value)
                        : undefined,
                favorites: sp.favorites.value,
                from: {
                    groupIds: sp.groups1.value,
                    // Object IDs are populated on save
                    objectIds: [] as number[],
                },
                to: {
                    groupIds: sp.groups2.value,
                    objectIds: [] as number[],
                },
                legendGroups: makeLegendGroups([...sp.groups1.value, ...sp.groups2.value, ...sp.favorites.value]),
            };
        }),
        hasFromAndTo: deviationForm.hasFromAndTo,
        deviationType: deviationForm.deviationType.value,
        index: deviationForm.index,
    };
}

function checkIfRebuildIsRequired(prev: UiDeviationProfile, next: UiDeviationProfile) {
    return (
        prev.deviationType !== next.deviationType ||
        prev.subprofiles.length !== next.subprofiles.length ||
        prev.subprofiles.some((spPrev, i) => {
            const spNext = next.subprofiles[i];
            return (
                !areGroupsIdsEqual(spPrev.from.groupIds, spNext.from.groupIds) ||
                !areGroupsIdsEqual(spPrev.to.groupIds, spNext.to.groupIds) ||
                spPrev.centerLine?.brepId !== spNext.centerLine?.brepId ||
                !areArraysEqual(
                    spPrev.centerLine?.parameterBounds || ([] as number[]),
                    spNext.centerLine?.parameterBounds ?? []
                ) ||
                spPrev.heightToCeiling !== spNext.heightToCeiling
            );
        })
    );
}

function areGroupsIdsEqual(a: string[], b: string[]) {
    return a.every((e) => b.includes(e));
}

function selectGroupsForIds(objectGroups: ObjectGroup[], ids: string[]): ObjectGroupExt[] {
    return ids.map((id) => {
        return objectGroups.find((g) => g.id === id) ?? { id, name: DELETED_DEVIATION_LABEL, deleted: true };
    });
}
