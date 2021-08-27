import { Box, Button, makeStyles, Menu } from "@material-ui/core";
import { useState, useEffect, forwardRef } from "react";

import NavigateNextIcon from "@material-ui/icons/NavigateNext";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";

const useStyles = makeStyles({
    breadcrumbExpandButton: {
        cursor: "pointer",
        display: "flex",
        borderRadius: " 2px",
        minWidth: 0,
    },
    breadcrumbSeparator: {
        display: "flex",
        userSelect: "none",
        marginLeft: 2,
        marginRight: 2,

        "& > svg": {
            fontSize: "0.85rem",
        },
    },
    breadcrumb: {
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    expandedBreadcrumbs: {
        "& button": {
            width: "100%",
        },
    },
});

const crumbsToShow = 2;

export function Breadcrumbs({
    rootName,
    path,
    id,
    onClick,
}: {
    rootName: string;
    path: string;
    id: string;
    onClick: (path: string) => void;
}) {
    const classes = useStyles();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const crumbs = (path ? ["", ...path.split("/")] : [""]).map((crumb, index, array) => {
        return (
            <Breadcrumb
                key={crumb ? crumb : "root"}
                fullPath={crumb ? array.slice(1, index + 1).join("/") : crumb}
                onClick={onClick}
                isLast={array.length > crumbsToShow && index === array.length - 1}
                name={crumb ? crumb : rootName}
            />
        );
    });
    const hiddenCrumbs = crumbs.slice(0, -crumbsToShow);
    const hiddenCrumbCount = hiddenCrumbs.length;
    const visibleCrumbs = crumbs.slice(-crumbsToShow).reduce<typeof crumbs>((acc, item, index) => {
        if (index === 0) {
            return [item];
        } else {
            return [
                ...acc,
                <div key={`separator-${index}`} aria-hidden className={classes.breadcrumbSeparator}>
                    <NavigateNextIcon />
                </div>,
                item,
            ];
        }
    }, []);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    useEffect(() => {
        setAnchorEl(null);
    }, [hiddenCrumbCount]);

    return (
        <Box display="flex" alignItems="center" width={1}>
            {hiddenCrumbCount ? (
                <>
                    <Button
                        className={classes.breadcrumbExpandButton}
                        aria-controls={id}
                        aria-haspopup="true"
                        onClick={handleClick}
                        size="small"
                    >
                        <MoreHorizIcon fontSize="small" />
                    </Button>
                    <Menu
                        className={classes.expandedBreadcrumbs}
                        id={id}
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleClose}
                    >
                        {hiddenCrumbs}
                    </Menu>
                    <div aria-hidden className={classes.breadcrumbSeparator}>
                        <NavigateNextIcon />
                    </div>
                </>
            ) : null}
            {visibleCrumbs}
        </Box>
    );
}

const Breadcrumb = forwardRef<
    HTMLButtonElement,
    {
        name: string;
        fullPath: string;
        isLast: boolean;
        onClick: (fullPath: string) => void;
    }
>(({ name, fullPath, isLast, onClick }, ref) => {
    const classes = useStyles();

    return (
        <Box display="flex" flex={isLast ? "1 0 auto" : "0 1 auto"} width={isLast ? 0 : "auto"} overflow="hidden">
            <Button ref={ref} size="small" className={classes.breadcrumb} onClick={() => onClick(fullPath)}>
                <Box overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis" component="span">
                    {name}
                </Box>
            </Button>
        </Box>
    );
});
