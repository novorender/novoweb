import { Box, Button, Menu, styled, useTheme } from "@mui/material";
import { css } from "@mui/styled-engine";
import { useState, useEffect, forwardRef, HTMLProps } from "react";

import { decodeObjPathName } from "utils/objectData";

import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { Tooltip } from "components";

const BreadcrumbSeparator = styled((props: HTMLProps<HTMLDivElement>) => (
    <div {...props} aria-hidden>
        <NavigateNextIcon />
    </div>
))(
    () => css`
        display: flex;
        user-select: "none";
        margin-left: 2px;
        margin-right: 2px;

        & > svg {
            font-size: 0.85rem;
        }
    `
);

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
    const theme = useTheme();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const crumbs = (path ? ["", ...path.split("/")] : [""]).map((crumb, index, array) => {
        return (
            <Breadcrumb
                key={crumb ? crumb + index : "root"}
                fullPath={crumb ? array.slice(1, index + 1).join("/") : crumb}
                onClick={onClick}
                isLast={array.length > crumbsToShow && index === array.length - 1}
                name={crumb ? decodeObjPathName(crumb) : rootName}
            />
        );
    });
    const hiddenCrumbs = crumbs.slice(0, -crumbsToShow);
    const hiddenCrumbCount = hiddenCrumbs.length;
    const visibleCrumbs = crumbs.slice(-crumbsToShow).reduce<typeof crumbs>((acc, item, index) => {
        if (index === 0) {
            return [item];
        } else {
            return [...acc, <BreadcrumbSeparator key={`separator-${index}`} />, item];
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
        <Box display="flex" alignItems="center" width={1} data-test="breadcrumbs">
            {hiddenCrumbCount ? (
                <>
                    <Button
                        data-test="expand-breadcrumbs"
                        sx={{
                            cursor: "pointer",
                            display: "flex",
                            borderRadius: " 2px",
                            minWidth: 0,
                        }}
                        color="grey"
                        aria-controls={id}
                        aria-haspopup="true"
                        onClick={handleClick}
                        size="small"
                    >
                        <MoreHorizIcon fontSize="small" />
                    </Button>
                    <Menu
                        data-test="expanded-breadcrumbs"
                        sx={{
                            "& button": {
                                width: 1,
                                color: theme.palette.text.primary,
                                px: 1,
                                justifyContent: "center",
                            },
                        }}
                        id={id}
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleClose}
                    >
                        {hiddenCrumbs}
                    </Menu>
                    <BreadcrumbSeparator />
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
    return (
        <Box display="flex" flex={isLast ? "1 2 auto" : "0 3 auto"} width={"auto"} overflow="hidden">
            <Button
                ref={ref}
                size="small"
                color="grey"
                sx={{ textOverflow: "ellipsis", whiteSpace: "nowrap", justifyContent: "flex-start", minWidth: 32 }}
                onClick={() => onClick(fullPath)}
            >
                <Tooltip title={<Box onClick={(e) => e.stopPropagation()}>{name}</Box>}>
                    <Box overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis" component="span">
                        {name}
                    </Box>
                </Tooltip>
            </Button>
        </Box>
    );
});
