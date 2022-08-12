import { Box, CircularProgress, SpeedDialActionProps } from "@mui/material";
import { useState } from "react";

import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";

import { useResetView } from "./useResetView";

type Props = SpeedDialActionProps & {
  position?: { top?: number; right?: number; bottom?: number; left?: number };
};

enum Status {
  Initial,
  Loading,
}

const { name, Icon } = featuresConfig["home"];

export function Home({ position, ...speedDialProps }: Props) {
  const [status, setStatus] = useState(Status.Initial);
  const disabled = status === Status.Loading;
  const resetView = useResetView();

  const handleClick = async () => {
    setStatus(Status.Loading);
    await resetView();
    setStatus(Status.Initial);
  };

  return (
    <SpeedDialAction
      {...speedDialProps}
      data-test="home"
      FabProps={{
        disabled,
        ...speedDialProps.FabProps,
        style: { ...position, position: "absolute" },
      }}
      onClick={handleClick}
      title={name}
      icon={
        <Box
          width={1}
          height={1}
          position="relative"
          display="inline-flex"
          justifyContent="center"
          alignItems="center"
        >
          {status === Status.Loading
            ? <CircularProgress thickness={2.5} sx={{ position: "absolute" }} />
            : null}
          <Icon />
        </Box>
      }
    />
  );
}
