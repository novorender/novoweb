import { featuresConfig } from "config/features";

export function ActiveIcon({ Icon, active }: { Icon: typeof featuresConfig.area.Icon; active: boolean }) {
    return <Icon color={active ? "primary" : undefined} />;
}
