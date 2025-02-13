
type Frame = {
    sprite: string;
    duration: number;
    next: string;
}


type Sprite = {
    location: number[];
    size: number[];
};

type Atlas = {
    url: string,
    size: number[];
    sprites: { [n: string]: Sprite };
    frames: { [n: string]: Frame }
};


function spriteSheet(atlas: Atlas) {
    return {
        _frames: atlas.frames,
        _currentSpriteTime: 0,
        _currentFrame: Object.keys(atlas.frames)[0],

        set current(n: string) {
            this._currentFrame = n;
        },

        get sprite() {
            return this._info.sprite;
        },

        update(dt: number) {
            this._currentSpriteTime += dt;
            if (this._currentSpriteTime > this._info.duration) {
                this._currentSpriteTime = 0;
                this._currentFrame = this._info.next;
            }

            return this;
        },

        get _info() {
            return this._frames[this._currentFrame];
        },

        _atlas: atlas,
        _imgSize: atlas.size,
        transform: new Float32Array(9),
        _current: atlas.frames[Object.keys(atlas.frames)[0]].sprite,

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
