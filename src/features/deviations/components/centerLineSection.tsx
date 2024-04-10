import { Add, DeleteForever } from "@mui/icons-material";
import { Autocomplete, Box, Button, IconButton, LinearProgress, TextField, useTheme } from "@mui/material";
import { ParameterBounds } from "@novorender/api";
import { useEffect, useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { areArraysEqual } from "features/arcgis/utils";
import { selectLandXmlPaths } from "features/followPath";
import { AsyncState, AsyncStatus } from "types/misc";

import { CenterLineGroup } from "../deviationTypes";
import { EMPTY_PARAMETER_BOUNDS } from "../utils";
import { updateFormField } from "../validation";
import { ParamBoundsInput } from "./paramBoundsInput";
import { SectionHeader } from "./sectionHeader";

export function CenterLineSection({
    centerLine,
    onChange,
    disabled,
}: {
    centerLine: CenterLineGroup;
    onChange: (centerLine: CenterLineGroup) => void;
    disabled?: boolean;
}) {
    const theme = useTheme();
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const landXmlPaths = useAppSelector(selectLandXmlPaths);
    const followPath =
        landXmlPaths.status === AsyncStatus.Success
            ? landXmlPaths.data.find((e) => e.id === centerLine.id.value)
            : undefined;
    const [paramRange, setParamRange] = useState<AsyncState<ParameterBounds>>({ status: AsyncStatus.Initial });
    const canEditParamBounds = paramRange.status === AsyncStatus.Success;

    useEffect(() => {
        loadParamRange();

        async function loadParamRange() {
            if (!followPath || paramRange.status !== AsyncStatus.Initial) {
                return;
            }

            setParamRange({ status: AsyncStatus.Loading });

            try {
                const fp = await view.measure?.followPath.followParametricObjects([followPath.id], {
                    cylinderMeasure: "center",
                });

                if (!fp) {
                    setParamRange({ status: AsyncStatus.Error, msg: "No parameter bounds" });
                    return;
                }

                setParamRange({ status: AsyncStatus.Success, data: fp.parameterBounds });

                const oldParamBounds = centerLine.parameterBounds.value;
                let newParamBounds: [number, number];
                if (oldParamBounds === EMPTY_PARAMETER_BOUNDS) {
                    newParamBounds = [fp.parameterBounds.start, fp.parameterBounds.end];
                } else {
                    const start = Math.max(fp.parameterBounds.start, oldParamBounds[0]);
                    newParamBounds = [start, Math.max(start, Math.min(fp.parameterBounds.end, oldParamBounds[1]))];
                }

                if (!areArraysEqual(oldParamBounds, newParamBounds)) {
                    onChange({
                        ...centerLine,
                        parameterBounds: updateFormField(newParamBounds),
                    });
                }
            } catch (ex) {
                console.warn(ex);
                setParamRange({ status: AsyncStatus.Error, msg: "Error loading parameter range" });
            }
        }
    }, [view, onChange, followPath, paramRange, centerLine]);

    if (!centerLine.enabled) {
        if (disabled) {
            return null;
        }

        return (
            <Box display="flex" m={2} justifyContent="center">
                <Button
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                    size="large"
                    onClick={() => onChange({ ...centerLine, enabled: true })}
                >
                    <Add sx={{ mr: 1 }} /> Add center line
                </Button>
            </Box>
        );
    }

    return (
        <>
            <SectionHeader>Select center line and start</SectionHeader>
            <Box display="flex" alignItems="center" gap={1} mt={2}>
                <Autocomplete
                    options={landXmlPaths.status === AsyncStatus.Success ? landXmlPaths.data : []}
                    getOptionLabel={(g) => g.name}
                    fullWidth
                    sx={{ flex: "auto" }}
                    value={followPath ?? null}
                    loading={landXmlPaths.status === AsyncStatus.Loading}
                    onChange={(_, group) => {
                        onChange({ ...centerLine, id: updateFormField(group?.id) });
                        setParamRange({ status: AsyncStatus.Initial });
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Center line"
                            error={landXmlPaths.status === AsyncStatus.Error}
                            helperText={landXmlPaths.status === AsyncStatus.Error ? landXmlPaths.msg : ""}
                        />
                    )}
                    disabled={disabled}
                />
                <IconButton onClick={() => onChange({ ...centerLine, enabled: false })} disabled={disabled}>
                    <DeleteForever />
                </IconButton>
            </Box>

            <SectionHeader>Profile number range</SectionHeader>

            {paramRange.status === AsyncStatus.Loading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}

            {paramRange.status === AsyncStatus.Error ? (
                <Box color={theme.palette.error.main} textAlign="center">
                    {paramRange.msg}
                </Box>
            ) : null}

            <ParamBoundsInput
                value={centerLine.parameterBounds.value}
                onValueChange={(bounds) => onChange({ ...centerLine, parameterBounds: updateFormField(bounds) })}
                min={paramRange.status === AsyncStatus.Success ? paramRange.data.start : 0}
                max={paramRange.status === AsyncStatus.Success ? paramRange.data.end : 100}
                disabled={!canEditParamBounds || disabled}
                mt={2}
            />
        </>
    );
}
