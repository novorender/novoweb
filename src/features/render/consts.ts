import { StorageKey } from "config/storage";
import { vec3 } from "gl-matrix";
import { getFromStorage } from "utils/storage";

export const showPerformance = getFromStorage(StorageKey.ShowPerformanceStats) !== "";
export const taaEnabled = getFromStorage(StorageKey.DisableTaa) === "";
export const ssaoEnabled = getFromStorage(StorageKey.DisableSssao) === "";
export const axis = [
    vec3.fromValues(1, 0, 0),
    vec3.fromValues(0, 1, 0),
    vec3.fromValues(0, 0, 1),
    vec3.fromValues(1, 0, 0),
    vec3.fromValues(0, 1, 0),
    vec3.fromValues(0, 0, 1),
];
export const xAxis = vec3.fromValues(1, 0, 0);
export const yAxis = vec3.fromValues(0, 1, 0);
