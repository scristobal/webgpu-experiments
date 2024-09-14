import { loadImageBitmap } from './utils';

type SpriteAtlas = Array<{
    location: [number, number];
    size: [number, number];
}>;

function spritesAtlas(atlas: SpriteAtlas, imgSize: [number, number]) {
    return {
        _atlas: atlas,
        _index: -1,
        _imgSize: imgSize,
        transform: new Float32Array(9),
        _currentSpriteTime: 0,

        get new() {
            this._next();
            return this;
        },

        _next() {
            this._index = (this._index + 1) % this._atlas.length;

            // prettier-ignore
            this.transform.set([
                this._info.size[0] / this._imgSize[0], 0, 0,
                0, this._info.size[1] / this._imgSize[1], 0,
                this._info.location[0] / this._imgSize[0], this._info.location[1] / this._imgSize[1], 1
            ]);
        },

        update(dt: number) {
            this._currentSpriteTime += dt;
            if (this._currentSpriteTime > 1_000) {
                this._currentSpriteTime = 0;
                this._next();
            }
        },
        get size() {
            return this._atlas[this._index].size;
        },

        get _info() {
            return this._atlas[this._index];
        }
    };
}

async function loadSpriteSheet(url: string, atlas: SpriteAtlas) {
    const imgData = await loadImageBitmap(url);

    const sprites = spritesAtlas(atlas, [imgData.width, imgData.height]).new;

    return { imgData, sprites };
}

export { loadSpriteSheet };
