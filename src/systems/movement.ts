import { m4 } from 'src/helpers/matrix';

function movement() {
    return {
        _transform: m4().identity,
        center: { x: 0, y: 0, z: 0 },
        speed: { x: 0.02, y: 0.02, z: 0 },
        angle: 0,
        rotationSpeed: 0.01,

        moveRight(dt: number) {
            this.center.x += this.speed.x * dt;
            this._update();
        },
        moveLeft(dt: number) {
            this.center.x -= this.speed.x * dt;
            this._update();
        },
        moveUp(dt: number) {
            this.center.y += this.speed.y * dt;
            this._update();
        },
        moveDown(dt: number) {
            this.center.y -= this.speed.y * dt;
            this._update();
        },
        rotateClockWise(dt: number) {
            this.angle += this.rotationSpeed * dt;
            this._update();
        },
        rotateCounterClockWise(dt: number) {
            this.angle -= this.rotationSpeed * dt;
            this._update();
        },

        _update() {
            this._transform.identity.translate(this.center.x, this.center.y, this.center.z).rotate(0, 0, 1, this.angle);
        },

        get transform() {
            return this._transform.data;
        }
    };
}

export { movement };
