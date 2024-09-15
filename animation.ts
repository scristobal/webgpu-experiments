type Animation = {
    [n: string]: {
        sprite: string;
        duration: number;
        next: string;
    };
};

function animation(animationDef: Animation) {
    return {
        _definition: animationDef,
        _currentSpriteTime: 0,
        _currentAnimation: Object.keys(animationDef)[0],

        set current(n: string) {
            this._currentAnimation = n;
        },

        get sprite() {
            return this._info.sprite;
        },

        update(dt: number) {
            this._currentSpriteTime += dt;
            if (this._currentSpriteTime > this._info.duration) {
                this._currentSpriteTime = 0;
                this._currentAnimation = this._info.next;
            }

            return this;
        },

        get _info() {
            return this._definition[this._currentAnimation];
        }
    };
}

export { animation };
