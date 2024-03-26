import type { ObjectGroup, SceneData } from "@novorender/data-js-api";
import type { BoundingSphere, Camera, Internal } from "@novorender/webgl-api";
import { quat, vec3 } from "gl-matrix";

import { type DitioMachine } from "features/ditio";
import { Checklist } from "features/ditio/types";
import { type LogPoint, type MachineLocation } from "features/xsiteManage";
import { type CustomProperties } from "types/project";

export enum CameraSpeedLevel {
    Slow = "slow",
    Default = "default",
    Fast = "fast",
}

export enum ObjectVisibility {
    Neutral = "neutral",
    SemiTransparent = "semiTransparent",
    Transparent = "transparent",
}

export enum CameraType {
    Orthographic,
    Pinhole,
}

export enum SubtreeStatus {
    Unavailable,
    Shown,
    Hidden,
}

export enum SelectionBasketMode {
    Loose,
    Strict,
}

export enum Picker {
    Object,
    Measurement,
    FollowPathObject,
    ClippingPlane,
    ClippingBox,
    OrthoPlane,
    CrossSection,
    Area,
    PointLine,
    HeightProfileEntity,
    Manhole,
    OutlineLaser,
}

export type Subtrees = {
    triangles: SubtreeStatus;
    lines: SubtreeStatus;
    terrain: SubtreeStatus;
    points: SubtreeStatus;
    documents: SubtreeStatus;
};
export type Subtree = keyof Subtrees;

export type CameraStep = { position: vec3; rotation: quat; fov?: number; kind: CameraType };
export type ObjectGroups = { default: ObjectGroup; defaultHidden: ObjectGroup; custom: ObjectGroup[] };

// Redux toolkit with immer removes readonly modifier of state in the reducer so we get ts errors
// unless we cast the types to writable ones.
export type DeepMutable<T> = { -readonly [P in keyof T]: DeepMutable<T[P]> };
export type CameraState =
    | {
          type: CameraType.Orthographic;
          goTo?: {
              position: Camera["position"];
              rotation: Camera["rotation"];
              fov?: number;
              far?: number;
              near?: number;
              flyTime?: number;
          };
          gridOrigo?: vec3;
      }
    | {
          type: CameraType.Pinhole;
          goTo?: {
              position: Camera["position"];
              rotation: Camera["rotation"];
              fov?: number;
              far?: number;
              near?: number;
              flyTime?: number;
          };
          zoomTo?: BoundingSphere;
      };

export type SavedCameraPositions = { currentIndex: number; positions: CameraStep[] };

export enum StampKind {
    LogPoint,
    XsiteManageMachineLocation,
    DitioMachine,
    DitioChecklist,
    Deviation,
    CanvasContextMenu,
    Properties,
}

type LogPointStamp = {
    kind: StampKind.LogPoint;
    data: {
        logPoint: LogPoint;
    };
};

type XsiteManageMachineLocationStamp = {
    kind: StampKind.XsiteManageMachineLocation;
    data: {
        location: MachineLocation;
    };
};

type DitioMachineStamp = {
    kind: StampKind.DitioMachine;
    data: {
        machine: DitioMachine;
    };
};

type DitioChecklistStamp = {
    kind: StampKind.DitioChecklist;
    data: {
        checklist: Checklist;
    };
};

type DeviationStamp = {
    kind: StampKind.Deviation;
    data: {
        deviation: number;
    };
};

type CanvasContextMenuStamp = {
    kind: StampKind.CanvasContextMenu;
    data: {
        object?: number;
        position?: Vec3;
        normal?: Vec3 | undefined;
    };
};

type PropertiesStamp = {
    kind: StampKind.Properties;
    properties: [key: string, value: string][];
};

export type Stamp = { mouseX: number; mouseY: number; pinned: boolean } & (
    | LogPointStamp
    | XsiteManageMachineLocationStamp
    | DeviationStamp
    | CanvasContextMenuStamp
    | PropertiesStamp
    | DitioMachineStamp
    | DitioChecklistStamp
);

export type SceneConfig = Omit<SceneData, "settings" | "customProperties"> & {
    settings: Internal.RenderSettingsExt;
    customProperties: CustomProperties;
};

export type CadCamera = { kind: "pinhole" | "orthographic"; position: vec3; rotation: quat; fov: number };
