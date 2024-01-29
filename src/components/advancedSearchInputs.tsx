import { Cancel, Close, DragHandle, MoreVert, NotInterested } from "@mui/icons-material";
import {
    Box,
    Button,
    ButtonProps,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    styled,
} from "@mui/material";
import { css } from "@mui/styled-engine";
import { SearchPattern } from "@novorender/webgl-api";
import { Dispatch, MouseEvent, SetStateAction, useState } from "react";

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
    setFocusedInputIdx,
    maxHeight = 92,
}: {
    inputs: SearchPattern[];
    setInputs: Dispatch<SetStateAction<SearchPattern[]>>;
    setFocusedInputIdx?: (idx: number) => void;
    maxHeight?: number | string;
}) {
    return (
        <ScrollBox maxHeight={maxHeight} mb={2} pt={1} mx={-1} px={1}>
            {inputs.map((input, index, array) => (
                <AdvancedInput
                    key={index}
                    input={input}
                    index={index}
                    isLast={index === array.length - 1}
                    setInputs={setInputs}
                    setFocusedInputIdx={setFocusedInputIdx}
                />
            ))}
        </ScrollBox>
    );
}

export function AdvancedInput({
    input,
    index,
    isLast,
    setInputs,
    setFocusedInputIdx,
}: {
    input: SearchPattern;
    index: number;
    isLast: boolean;
    setInputs: Dispatch<SetStateAction<SearchPattern[]>>;
    setFocusedInputIdx?: (idx: number) => void;
}) {
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const { property, value, exact, exclude } = input;
    const multipleValues = Array.isArray(value);

    return (
        <Box display="flex" alignItems="center" mb={isLast ? 0 : 1}>
            <TextField
                autoFocus={isLast}
                id={`advanced-search-property-${index}`}
                label={"Name"}
                fullWidth
                value={property}
                onChange={(e) =>
                    setInputs((inputs) =>
                        inputs.map((input, idx) => (idx === index ? { ...input, property: e.target.value } : input))
                    )
                }
            />
            <TextField
                id={`advanced-search-value-${index}`}
                label={"Value"}
                fullWidth
                value={multipleValues ? value.slice(-1)[0] : value}
                InputProps={{
                    ...(multipleValues
                        ? {
                              sx: { pl: 0 },
                              startAdornment: multipleValues ? (
                                  <IconButton
                                      size="small"
                                      color={menuAnchor ? "primary" : "default"}
                                      aria-haspopup="true"
                                      onClick={openMenu}
                                  >
                                      <MoreVert />
                                  </IconButton>
                              ) : undefined,
                          }
                        : undefined),
                    ...(setFocusedInputIdx
                        ? {
                              onFocus: () => {
                                  setFocusedInputIdx(index);
                              },
                          }
                        : undefined),
                }}
                onChange={(e) =>
                    setInputs((inputs) =>
                        inputs.map((input, idx) =>
                            idx === index
                                ? {
                                      ...input,
                                      value: multipleValues
                                          ? [...value.slice(0, value.length - 1), e.target.value]
                                          : e.target.value,
                                  }
                                : input
                        )
                    )
                }
            />
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                id={`${property}-menu`}
                MenuListProps={{ sx: { minWidth: 100, maxWidth: "100%" } }}
            >
                {multipleValues
                    ? value.slice(0, value.length - 1).map((val, valueIndex) => (
                          <MenuItem
                              key={val + valueIndex}
                              onClick={() =>
                                  setInputs((inputs) =>
                                      inputs.map((input, _index) => {
                                          if (index !== _index) {
                                              return input;
                                          }

                                          const updatedInput = {
                                              ...input,
                                              value: Array.isArray(input.value)
                                                  ? input.value.length > 2
                                                      ? input.value.filter(
                                                            (_, _valueIndex) => valueIndex !== _valueIndex
                                                        )
                                                      : input.value.filter(
                                                            (_, _valueIndex) => valueIndex !== _valueIndex
                                                        )[0]
                                                  : "",
                                          };

                                          if (!Array.isArray(updatedInput.value)) {
                                              closeMenu();
                                          }

                                          return updatedInput;
                                      })
                                  )
                              }
                          >
                              <ListItemText>{val}</ListItemText>
                              <ListItemIcon sx={{ minWidth: 0, ml: 2 }}>
                                  <Close fontSize="small" />
                              </ListItemIcon>
                          </MenuItem>
                      ))
                    : null}
            </Menu>
            <AdvancedSearchModifier
                sx={{ ml: 1 }}
                title="Exclude"
                onClick={() =>
                    setInputs((inputs) =>
                        inputs.map((input, idx) => (idx === index ? { ...input, exclude: !input.exclude } : input))
                    )
                }
                active={exclude}
                size="small"
            >
                <NotInterested fontSize="small" />
            </AdvancedSearchModifier>
            <AdvancedSearchModifier
                sx={{ ml: 1 }}
                title="Exact"
                onClick={() =>
                    setInputs((inputs) =>
                        inputs.map((input, idx) => (idx === index ? { ...input, exact: !input.exact } : input))
                    )
                }
                active={exact}
                size="small"
            >
                <DragHandle fontSize="small" />
            </AdvancedSearchModifier>
            <AdvancedSearchModifier
                sx={{ ml: 1 }}
                title="Remove"
                onClick={() => {
                    setInputs((inputs) => {
                        if (inputs.length <= 1) {
                            return [{ property: "", value: "", exact: true }];
                        }

                        if (setFocusedInputIdx) {
                            setFocusedInputIdx(-1);
                        }

                        return inputs.filter((_input, idx) => idx !== index);
                    });
                }}
                size="small"
            >
                <Cancel fontSize="small" />
            </AdvancedSearchModifier>
        </Box>
    );
}
