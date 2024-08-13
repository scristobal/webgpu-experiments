export function identity() {
    return scaling(new Float32Array([1, 1, 1]));
}

export function scaling(v: Float32Array) {
    // prettier-ignore
    return new Float32Array([
            v[0],    0,    0,   0, // <-- column 0
               0, v[1],    0,   0, // <-- column 1
               0,    0, v[2],   0, // <-- column 2
               0,    0,    0,   1  // <-- column 3
        ]);
}

export function translation(v: Float32Array) {
    // prettier-ignore
    return new Float32Array([
               1,    0,    0,    0, // <-- column 0
               0,    1,    0,    0, // <-- column 1
               0,    0,    1,    0, // <-- column 2
            v[0], v[1], v[2],    1  // <-- column 3
        ]);
}

export function multiply(lhs: Float32Array, rhs: Float32Array) {
    // prettier-ignore
    return new Float32Array([
            lhs[0] * rhs[0] + lhs[4] * rhs[1] + lhs[8] * rhs[2] + lhs[12] * rhs[3],
            lhs[1] * rhs[0] + lhs[5] * rhs[1] + lhs[9] * rhs[2] + lhs[13] * rhs[3],
            lhs[2] * rhs[0] + lhs[6] * rhs[1] + lhs[10] * rhs[2] + lhs[14] * rhs[3],
            lhs[3] * rhs[0] + lhs[7] * rhs[1] + lhs[11] * rhs[2] + lhs[15] * rhs[3],

            lhs[0] * rhs[4] + lhs[4] * rhs[5] + lhs[8] * rhs[6] + lhs[12] * rhs[7],
            lhs[1] * rhs[4] + lhs[5] * rhs[5] + lhs[9] * rhs[6] + lhs[13] * rhs[7],
            lhs[2] * rhs[4] + lhs[6] * rhs[5] + lhs[10] * rhs[6] + lhs[14] * rhs[7],
            lhs[3] * rhs[4] + lhs[7] * rhs[5] + lhs[11] * rhs[6] + lhs[15] * rhs[7],

            lhs[0] * rhs[8] + lhs[4] * rhs[9] + lhs[8] * rhs[10] + lhs[12] * rhs[11],
            lhs[1] * rhs[8] + lhs[5] * rhs[9] + lhs[9] * rhs[10] + lhs[13] * rhs[11],
            lhs[2] * rhs[8] + lhs[6] * rhs[9] + lhs[10] * rhs[10] + lhs[14] * rhs[11],
            lhs[3] * rhs[8] + lhs[7] * rhs[9] + lhs[11] * rhs[10] + lhs[15] * rhs[11],

            lhs[0] * rhs[12] + lhs[4] * rhs[13] + lhs[8] * rhs[14] + lhs[12] * rhs[15],
            lhs[1] * rhs[12] + lhs[5] * rhs[13] + lhs[9] * rhs[14] + lhs[13] * rhs[15],
            lhs[2] * rhs[12] + lhs[6] * rhs[13] + lhs[10] * rhs[14] + lhs[14] * rhs[15],
            lhs[3] * rhs[12] + lhs[7] * rhs[13] + lhs[11] * rhs[14] + lhs[15] * rhs[15]
        ]);
}

export function scale(m: Float32Array, v: Float32Array) {
    return multiply(m, scaling(v));
}

export function translate(m: Float32Array, v: Float32Array) {
    return multiply(m, translation(v));
}
