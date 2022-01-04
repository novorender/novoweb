import { Dispatch, SetStateAction } from "react";
import { SearchPattern } from "@novorender/webgl-api";
import { Box, Button, ButtonProps, styled } from "@mui/material";
import { css } from "@mui/styled-engine";
import { Cancel, DragHandle } from "@mui/icons-material";

import { ScrollBox } from "./scrollBox";
import { TextField } from "./textField";

const AdvancedSearchModifier = styled(Button, {
    shouldForwardProp: (prop) => prop !== "active",
})<ButtonProps & { active?: boolean }>(
    ({ theme, active }) => css`
        width: 24px;
        height: 24px;
        min-width: 0;
        flex: 0 0 auto;
        padding: ${theme.spacing(1)};
        color: ${theme.palette.common.white};
        background: ${active ? theme.palette.primary.main : theme.palette.secondary.light};

        &:hover {
            background: ${active ? theme.palette.primary.dark : theme.palette.secondary.main};
        }
    `
);

export function AdvancedSearchInputs({
    inputs,
    setInputs,
}: {
    inputs: SearchPattern[];
    setInputs: Dispatch<SetStateAction<SearchPattern[]>>;
}) {
    return (
        <ScrollBox maxHeight={92} mb={2} pt={1} mx={-1} px={1}>
            {inputs.map(({ property, value, exact }, index, array) => (
                <Box key={index} display="flex" alignItems="center" mb={index === array.length - 1 ? 0 : 1}>
                    <TextField
                        autoComplete="novorender-property-name"
                        autoFocus={index === array.length - 1}
                        id={`advanced-search-property-${index}`}
                        label={"Name"}
                        fullWidth
                        value={property}
                        onChange={(e) =>
                            setInputs((inputs) =>
                                inputs.map((input, idx) =>
                                    idx === index ? { ...input, property: e.target.value } : input
                                )
                            )
                        }
                    />
                    <TextField
                        autoComplete="novorender-property-value"
                        id={`advanced-search-value-${index}`}
                        label={"Value"}
                        fullWidth
                        value={value}
                        onChange={(e) =>
                            setInputs((inputs) =>
                                inputs.map((input, idx) =>
                                    idx === index ? { ...input, value: e.target.value } : input
                                )
                            )
                        }
                    />
                    <Box mx={1}>
                        <AdvancedSearchModifier
                            title="Exact"
                            onClick={() =>
                                setInputs((inputs) =>
                                    inputs.map((input, idx) =>
                                        idx === index ? { ...input, exact: !input.exact } : input
                                    )
                                )
                            }
                            active={exact}
                            size="small"
                        >
                            <DragHandle fontSize="small" />
                        </AdvancedSearchModifier>
                    </Box>
                    <AdvancedSearchModifier
                        title="Remove"
                        onClick={() => {
                            if (inputs.length > 1) {
                                setInputs((inputs) => inputs.filter((_input, idx) => idx !== index));
                            } else {
                                setInputs([{ property: "", value: "", exact: true }]);
                            }
                        }}
                        size="small"
                    >
                        <Cancel fontSize="small" />
                    </AdvancedSearchModifier>
                </Box>
            ))}
        </ScrollBox>
    );
}
