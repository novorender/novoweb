export const singleCylinderOptions = [
    { val: "center", label: "Center" },
    { val: "top", label: "Outer top" },
    { val: "bottom", label: "Inner bottom" },
] as const;

export const multiCylinderOptions = [
    { val: "closest", label: "Closest" },
    { val: "furthest", label: "Furthest" },
] as const;

export const cylinderOptions = [...singleCylinderOptions, ...multiCylinderOptions];

export const selectionOption = [
    { val: "all", label: "All" },
    { val: "point", label: "Point" },
    { val: "curve", label: "Curve" },
    { val: "surface", label: "Surface" },
] as const;
