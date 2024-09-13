import { loadImageBitmap } from './utils';

type SpriteAtlas = Array<{
    location: [number, number];
    size: [number, number];
}>;

function spritesAtlas(atlas: SpriteAtlas, imgSize: [number, number]) {
    return {
        atlas: atlas,
        _index: 0,
        imgSize,
        transform: new Float32Array(9),

        get new() {
            this.index = 0;
            return this;
        },

        set index(i: number) {
            this._index = i;

            // prettier-ignore
            this.transform.set([
                this._info.size[0] / imgSize[0], 0, 0,
                0, this._info.size[1] / imgSize[1], 0,
                this._info.location[0] / imgSize[0], this._info.location[1] / imgSize[1], 1
            ]);
        },

        get index() {
            return this._index;
        },

        get size() {
            return this.atlas[this.index].size;
        },

        get _info() {
            return this.atlas[this.index];
        },
        get length() {
            return this.atlas.length;
        }
    };
}

async function loadSpriteSheet(url: string, atlas: SpriteAtlas) {
    const imgData = await loadImageBitmap(url);

    const sprites = spritesAtlas(atlas, [imgData.width, imgData.height]).new;

    return { imgData, sprites };
}

export { loadSpriteSheet };
