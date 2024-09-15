function m4() {
    return {
        data: new Float32Array(16),
        op: new Float32Array(16),

        get identity() {
            // prettier-ignore
            this.data.set([
                1, 0, 0, 0, // <-- column 0
                0, 1, 0, 0, // <-- column 1
                0, 0, 1, 0, // <-- column 2
                0, 0, 0, 1  // <-- column 3
           ]);

            return this;
        },

        __multiply() {
            // prettier-ignore
            this.data.set([
                this.data[0] * this.op[0] + this.data[4] * this.op[1] + this.data[8] * this.op[2] + this.data[12] * this.op[3],
                this.data[1] * this.op[0] + this.data[5] * this.op[1] + this.data[9] * this.op[2] + this.data[13] * this.op[3],
                this.data[2] * this.op[0] + this.data[6] * this.op[1] + this.data[10] * this.op[2] + this.data[14] * this.op[3],
                this.data[3] * this.op[0] + this.data[7] * this.op[1] + this.data[11] * this.op[2] + this.data[15] * this.op[3],

                this.data[0] * this.op[4] + this.data[4] * this.op[5] + this.data[8] * this.op[6] + this.data[12] * this.op[7],
                this.data[1] * this.op[4] + this.data[5] * this.op[5] + this.data[9] * this.op[6] + this.data[13] * this.op[7],
                this.data[2] * this.op[4] + this.data[6] * this.op[5] + this.data[10] * this.op[6] + this.data[14] * this.op[7],
                this.data[3] * this.op[4] + this.data[7] * this.op[5] + this.data[11] * this.op[6] + this.data[15] * this.op[7],

                this.data[0] * this.op[8] + this.data[4] * this.op[9] + this.data[8] * this.op[10] + this.data[12] * this.op[11],
                this.data[1] * this.op[8] + this.data[5] * this.op[9] + this.data[9] * this.op[10] + this.data[13] * this.op[11],
                this.data[2] * this.op[8] + this.data[6] * this.op[9] + this.data[10] * this.op[10] + this.data[14] * this.op[11],
                this.data[3] * this.op[8] + this.data[7] * this.op[9] + this.data[11] * this.op[10] + this.data[15] * this.op[11],

                this.data[0] * this.op[12] + this.data[4] * this.op[13] + this.data[8] * this.op[14] + this.data[12] * this.op[15],
                this.data[1] * this.op[12] + this.data[5] * this.op[13] + this.data[9] * this.op[14] + this.data[13] * this.op[15],
                this.data[2] * this.op[12] + this.data[6] * this.op[13] + this.data[10] * this.op[14] + this.data[14] * this.op[15],
                this.data[3] * this.op[12] + this.data[7] * this.op[13] + this.data[11] * this.op[14] + this.data[15] * this.op[15]
            ])

            return this;
        },
        rotate(ux: number, uy: number, uz: number, rd: number) {
            const c = Math.cos(rd);
            const s = Math.sin(rd);

            // prettier-ignore
            this.op.set([
                  ux * ux * (1-c) + c,  ux * uy * (1-c) + uz * s,  ux * uz * (1-c) - uy * s,  0, // <-- column 0
             ux * uy * (1-c) - uz * s,       uy * uy * (1-c) + c,  uy * uz * (1-c) + ux * s,  0, // <-- column 1
             ux * uz * (1-c) + uy * s,  uy * uz * (1-c) - ux * s,       uz * uz * (1-c) + c,  0, // <-- column 2
                                    0,                         0,                         0,  1  // <-- column 3
        ])

            return this.__multiply();
        },
        scale(sx: number, sy: number, sz: number) {
            // prettier-ignore
            this.op.set([
              sx,   0,   0,   0, // <-- column 0
               0,  sy,   0,   0, // <-- column 1
               0,   0,  sz,   0, // <-- column 2
               0,   0,   0,   1  // <-- column 3
        ]);

            return this.__multiply();
        },
        translate(tx: number, ty: number, tz: number) {
            // prettier-ignore
            this.op.set([
               1,   0,   0,   0, // <-- column 0
               0,   1,   0,   0, // <-- column 1
               0,   0,   1,   0, // <-- column 2
              tx,  ty,  tz,   1  // <-- column 3
        ]);

            return this.__multiply();
        }
    };
}

export { m4 };
