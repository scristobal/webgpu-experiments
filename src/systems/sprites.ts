type Frame = {
    sprite: string;
    duration: number;
    next: string;
};

type Sprite = {
    location: number[];
    size: number[];
};

type Atlas = {
    url: string;
    size: number[];
    sprites: { [n: string]: Sprite };
    frames: { [n: string]: Frame };
};

function spriteSheet(atlas: Atlas) {
    return {
        _frames: atlas.frames,
        _sprites: atlas.sprites,
        _imgSize: atlas.size,

        transform: new Float32Array(9),

        _currentFrameTime: 0,
        _currentFrameName: Object.keys(atlas.frames)[0],

        update(dt: number) {
            this._currentFrameTime += dt;

            if (this._currentFrameTime > this._currentFrame.duration) {
                this._currentFrameTime = this._currentFrame.duration - this._currentFrameTime;
                this._currentFrameName = this._currentFrame.next;

                // prettier-ignore
                this.transform.set([
                    this._currentSprite.size[0] / this._imgSize[0], 0, 0,
                    0, this._currentSprite.size[1] / this._imgSize[1], 0,
                    this._currentSprite.location[0] / this._imgSize[0], this._currentSprite.location[1] / this._imgSize[1], 1
                ]);
            }
        },

        get _currentFrame() {
            return this._frames[this._currentFrameName];
        },

        get _currentSprite() {
            return this._sprites[this._frames[this._currentFrameName].sprite];
        },

        get size() {
            return this._currentSprite.size;
        }
    };
}

export { spriteSheet };
