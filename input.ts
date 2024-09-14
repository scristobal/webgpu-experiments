/**
 *
 * Capture keyboard events
 *
 */

const inputHandler = {
    up: false,
    down: false,
    left: false,
    right: false,
    turnLeft: false,
    turnRight: false,

    get keypress() {
        return this.right || this.left || this.up || this.down || this.turnLeft || this.turnRight;
    }
};

window.onkeydown = (e) => {
    switch (e.key) {
        case 'w':
        case 'ArrowUp':
            inputHandler.up = true;
            break;
        case 'a':
        case 'ArrowLeft':
            inputHandler.left = true;
            break;
        case 's':
        case 'ArrowDown':
            inputHandler.down = true;
            break;
        case 'd':
        case 'ArrowRight':
            inputHandler.right = true;
            break;
        case 'q':
            inputHandler.turnLeft = true;
            break;
        case 'e':
            inputHandler.turnRight = true;
            break;
    }
};

window.onkeyup = (e) => {
    switch (e.key) {
        case 'w':
        case 'ArrowUp':
            inputHandler.up = false;
            break;
        case 'a':
        case 'ArrowLeft':
            inputHandler.left = false;
            break;
        case 's':
        case 'ArrowDown':
            inputHandler.down = false;
            break;
        case 'd':
        case 'ArrowRight':
            inputHandler.right = false;
            break;
        case 'q':
            inputHandler.turnLeft = false;
            break;
        case 'e':
            inputHandler.turnRight = false;
            break;
    }
};

export { inputHandler };
