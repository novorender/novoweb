import { useHandleManholeCollision } from "./useHandleManholeCollision";
import { useHandleManholeConnectedCylinder } from "./useHandleManholeConnectedCylinder";
import { useHandleManholeInspect } from "./useHandleManholeInspect";

export function useHandleManholeUpdates() {
    useHandleManholeInspect();
    useHandleManholeConnectedCylinder();
    useHandleManholeCollision();
}
