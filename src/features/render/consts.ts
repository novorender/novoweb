import { vec3 } from "gl-matrix";

export const showPerformance = localStorage.getItem("show-performance-stats") !== null;
export const taaEnabled = localStorage.getItem("disable-taa") === null;
export const ssaoEnabled = localStorage.getItem("disable-ssao") === null;
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
