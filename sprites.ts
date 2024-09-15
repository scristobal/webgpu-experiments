type Sprites = {
    location: [number, number];
    size: [number, number];
};

type Atlas = {
    imgSize: [number, number];
    sprites: { [n: string]: Sprites };
};

function spriteSheet(atlas: Atlas) {
    return {
        _atlas: atlas,
        _imgSize: atlas.imgSize,
        transform: new Float32Array(9),
        _current: '',

        set sprite(name: string) {
            if (this._current === name) return;

            this._current = name;

            // prettier-ignore
            this.transform.set([
                this._sprite.size[0] / this._imgSize[0], 0, 0,
                0, this._sprite.size[1] / this._imgSize[1], 0,
                this._sprite.location[0] / this._imgSize[0], this._sprite.location[1] / this._imgSize[1], 1
            ]);
        },

        get size() {
            return this._sprite.size;
        },

        get _sprite() {
            return this._atlas.sprites[this._current];
        }
    };
}

export { spriteSheet };
