type AnimationFrames = Array<{
    location: [number, number];
    size: [number, number];
}>;

type Atlas = {
    imgSize: [number, number];
    animations: Array<{ name: string; frames: AnimationFrames }>;
};

function spriteSheet(atlas: Atlas) {
    return {
        _atlas: atlas,
        _index: 0,
        _imgSize: atlas.imgSize,
        transform: new Float32Array(9),
        _currentSpriteTime: 0,
        _currentAnimation: { name: '', frames: [] } as Atlas['animations'][0],

        get new() {
            this._next();
            return this;
        },

        _next() {
            this._index = (this._index + 1) % this._currentAnimation.frames.length;

            // prettier-ignore
            this.transform.set([
                this._info.size[0] / this._imgSize[0], 0, 0,
                0, this._info.size[1] / this._imgSize[1], 0,
                this._info.location[0] / this._imgSize[0], this._info.location[1] / this._imgSize[1], 1
            ]);
        },

        set animation(name: string) {
            this._currentAnimation = this._atlas.animations.find((animation) => animation.name === name) ?? this._currentAnimation;
        },



        update(dt: number) {
            this._currentSpriteTime += dt;
            if (this._currentSpriteTime > 1_000) {
                this._currentSpriteTime = 0;
                this._next();
            }
        },

        get size() {
            return this._info.size;
        },

        get _info() {
            return this._currentAnimation.frames[this._index];
        }
    };
}

export { spriteSheet };
