const m4 = {
    data: new Float32Array(),

    get identity() {
        // prettier-ignore
        this.data= new Float32Array([
                1, 0, 0, 0, // <-- column 0
                0, 1, 0, 0, // <-- column 1
                0, 0, 1, 0, // <-- column 2
                0, 0, 0, 1  // <-- column 3
           ]);

        return this;
    },

    _multiply(rhs: Float32Array) {
        // prettier-ignore
        return new Float32Array([
                this.data[0] * rhs[0] + this.data[4] * rhs[1] + this.data[8] * rhs[2] + this.data[12] * rhs[3],
                this.data[1] * rhs[0] + this.data[5] * rhs[1] + this.data[9] * rhs[2] + this.data[13] * rhs[3],
                this.data[2] * rhs[0] + this.data[6] * rhs[1] + this.data[10] * rhs[2] + this.data[14] * rhs[3],
                this.data[3] * rhs[0] + this.data[7] * rhs[1] + this.data[11] * rhs[2] + this.data[15] * rhs[3],

                this.data[0] * rhs[4] + this.data[4] * rhs[5] + this.data[8] * rhs[6] + this.data[12] * rhs[7],
                this.data[1] * rhs[4] + this.data[5] * rhs[5] + this.data[9] * rhs[6] + this.data[13] * rhs[7],
                this.data[2] * rhs[4] + this.data[6] * rhs[5] + this.data[10] * rhs[6] + this.data[14] * rhs[7],
                this.data[3] * rhs[4] + this.data[7] * rhs[5] + this.data[11] * rhs[6] + this.data[15] * rhs[7],

                this.data[0] * rhs[8] + this.data[4] * rhs[9] + this.data[8] * rhs[10] + this.data[12] * rhs[11],
                this.data[1] * rhs[8] + this.data[5] * rhs[9] + this.data[9] * rhs[10] + this.data[13] * rhs[11],
                this.data[2] * rhs[8] + this.data[6] * rhs[9] + this.data[10] * rhs[10] + this.data[14] * rhs[11],
                this.data[3] * rhs[8] + this.data[7] * rhs[9] + this.data[11] * rhs[10] + this.data[15] * rhs[11],

                this.data[0] * rhs[12] + this.data[4] * rhs[13] + this.data[8] * rhs[14] + this.data[12] * rhs[15],
                this.data[1] * rhs[12] + this.data[5] * rhs[13] + this.data[9] * rhs[14] + this.data[13] * rhs[15],
                this.data[2] * rhs[12] + this.data[6] * rhs[13] + this.data[10] * rhs[14] + this.data[14] * rhs[15],
                this.data[3] * rhs[12] + this.data[7] * rhs[13] + this.data[11] * rhs[14] + this.data[15] * rhs[15]
            ])
    },

    scale(v: Float32Array) {
        // prettier-ignore
        const s =  new Float32Array([
            v[0],    0,    0,    0, // <-- column 0
               0, v[1],    0,    0, // <-- column 1
               0,    0, v[2],    0, // <-- column 2
               0,    0,    0,    1  // <-- column 3
        ]);

        this.data = this._multiply(s);

        return this;
    },

    translate(v: Float32Array) {
        // prettier-ignore
        const t = new Float32Array([
               1,    0,    0,    0, // <-- column 0
               0,    1,    0,    0, // <-- column 1
               0,    0,    1,    0, // <-- column 2
            v[0], v[1], v[2],    1  // <-- column 3
        ]);

        this.data = this._multiply(t);

        return this;
    }
};

export { m4 };
