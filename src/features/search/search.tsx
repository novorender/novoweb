import { useState } from "react";
import { makeStyles, createStyles, Box, Button, FormControlLabel } from "@material-ui/core";

import { TextField, Switch } from "components";
import { useToggle } from "hooks/useToggle";

import AddCircleIcon from "@material-ui/icons/AddCircle";
import DragHandleIcon from "@material-ui/icons/DragHandle";
import CancelIcon from "@material-ui/icons/Cancel";

const useSearchStyles = makeStyles((theme) =>
    createStyles({
        form: {
            margin: 0,
        },
        switchFormControl: {
            marginLeft: 0,
        },
        advancedSearchModifier: {
            width: 24,
            height: 24,
            minWidth: 0,
            flex: "0 0 auto",
            padding: theme.spacing(1),
            background: theme.palette.secondary.light,
            "&:hover": {
                background: theme.palette.secondary.main,

                "&.active": {
                    background: theme.palette.brand.dark,
                },
            },

            "&.active": {
                background: theme.palette.brand.main,
            },
        },
        searchButton: {
            background: theme.palette.brand.main,
            color: "#fff",
            textTransform: "none",

            "&:hover": {
                background: theme.palette.brand.dark,
            },
        },
        cancelButton: {
            border: `1px solid ${theme.palette.grey[600]}`,
            marginRight: theme.spacing(1),
            textTransform: "none",

            "&:hover": {
                background: theme.palette.grey[600],
                color: theme.palette.common.white,
            },
        },
        addCriteria: {
            padding: 0,
        },
    })
);

export function Search({ open, onSearch, onClose }: { open: boolean; onSearch: () => void; onClose: () => void }) {
    const classes = useSearchStyles();

    const [advanced, toggleAdvanced] = useToggle();
    const [simpleInput, setSimpleInput] = useState("");
    const [advancedInputs, setAdvancedInputs] = useState([{ property: "", value: "", exact: true }]);

    if (!open) {
        return null;
    }

    return (
        <Box>
            <form className={classes.form}>
                <Box mb={2}>
                    {advanced ? (
                        advancedInputs.map(({ property, value, exact }, index, array) => (
                            <Box key={index} display="flex" alignItems="center" mb={index === array.length - 1 ? 0 : 1}>
                                <TextField
                                    autoFocus={index === array.length - 1}
                                    id={`advanced-search-property-${index}`}
                                    label={"Name"}
                                    variant="outlined"
                                    fullWidth
                                    value={property}
                                    onChange={(e) =>
                                        setAdvancedInputs((inputs) =>
                                            inputs.map((input, idx) =>
                                                idx === index ? { ...input, property: e.target.value } : input
                                            )
                                        )
                                    }
                                />
                                <TextField
                                    id={`advanced-search-value-${index}`}
                                    label={"Value"}
                                    variant="outlined"
                                    fullWidth
                                    value={value}
                                    onChange={(e) =>
                                        setAdvancedInputs((inputs) =>
                                            inputs.map((input, idx) =>
                                                idx === index ? { ...input, value: e.target.value } : input
                                            )
                                        )
                                    }
                                />
                                <Box mx={1}>
                                    <Button
                                        title="Exact"
                                        onClick={() =>
                                            setAdvancedInputs((inputs) =>
                                                inputs.map((input, idx) =>
                                                    idx === index ? { ...input, exact: !input.exact } : input
                                                )
                                            )
                                        }
                                        className={`${classes.advancedSearchModifier} ${exact ? "active" : ""}`}
                                        size="small"
                                    >
                                        <DragHandleIcon fontSize="small" color="primary" />
                                    </Button>
                                </Box>
                                <Button
                                    title="Remove"
                                    onClick={() => {
                                        if (advancedInputs.length > 1) {
                                            setAdvancedInputs((inputs) =>
                                                inputs.filter((_input, idx) => idx !== index)
                                            );
                                        } else {
                                            setAdvancedInputs([{ property: "", value: "", exact: true }]);
                                            toggleAdvanced();
                                        }
                                    }}
                                    className={`${classes.advancedSearchModifier}`}
                                    size="small"
                                >
                                    <CancelIcon fontSize="small" color="primary" />
                                </Button>
                            </Box>
                        ))
                    ) : (
                        <TextField
                            autoFocus
                            id="simple-search-field"
                            label={"Search"}
                            variant="outlined"
                            fullWidth
                            value={simpleInput}
                            onChange={(e) => setSimpleInput(e.target.value)}
                        />
                    )}
                </Box>
                <Box mb={2}>
                    <FormControlLabel
                        className={classes.switchFormControl}
                        control={<Switch checked={advanced} onChange={toggleAdvanced} />}
                        label={<Box ml={0.5}>Advanced</Box>}
                    />
                    {advanced ? (
                        <Button
                            className={classes.addCriteria}
                            size="small"
                            onClick={() =>
                                setAdvancedInputs((inputs) => [...inputs, { property: "", value: "", exact: true }])
                            }
                        >
                            <AddCircleIcon />
                            Add criteria
                        </Button>
                    ) : null}
                </Box>
                <Box display="flex">
                    <Button onClick={() => onClose()} fullWidth className={classes.cancelButton}>
                        Cancel
                    </Button>
                    <Button onClick={() => onSearch()} fullWidth className={classes.searchButton}>
                        Search
                    </Button>
                </Box>
            </form>
        </Box>
    );
}
