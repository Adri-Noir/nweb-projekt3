

const localStorageHighScoreKey = 'asteroids-high-score';
const FPS = 120;
const asteroidsCanvas = document.getElementById('asteroids-canvas');
const spaceshipImage = document.getElementById('spaceship');
const asteroidImage = document.getElementById('asteroid');
const gameOverDialog = document.getElementById('game-over');
const mainMenuDialog = document.getElementById('main-menu');
const highScoreElement = document.getElementById('high-score');

/**
 * Class for controlling the canvas
 */
class Canvas {
    starColors = ['#e0f7fa', '#fff176', '#ffd54f', '#ffb74d', '#f57c00', '#e65100'];
    constructor(canvas, backgroundColor) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.backgroundColor = backgroundColor;

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.stars = this._generateMovingBackground();
    }

    /**
     * Generates starts with random positions and colors
     * @returns list of stars
     * @private
     */
    _generateMovingBackground() {
        const stars = [];
        for (let i = 0; i < 150; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const radius = Math.random() * 2;
            const color = this.starColors[Math.floor(Math.random() * this.starColors.length)];
            stars.push({x, y, radius, color});
        }

        return stars;
    }

    /**
     * Generates the background
     */
    generateMovingBackground() {
        this.stars = this._generateMovingBackground();
    }

    /**
     * Fills the canvas with the background color and draws the stars
     */
    fill() {
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.stars.forEach(star => {
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2, false);
            this.ctx.fillStyle = star.color;
            this.ctx.fill();
            this.ctx.closePath();
        });
    }

    /**
     * Clears the canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Updates the canvas
     */
    update() {
        this.clear();
        this.fill();
    }

    /**
     * Draws the current time
     * @param time - time to draw
     */
    drawCurrentTime(time) {
        this.ctx.save();
        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = '#eeeeee';
        this.ctx.fillText(time, this.canvas.width - 200, 30);
        this.ctx.restore();
    }

    /**
     * Draws the high score
     * @param time - high score to draw
     */
    drawHighScore(time) {
        this.ctx.save();
        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = '#eeeeee';
        this.ctx.fillText(time, this.canvas.width - 200, 60);
        this.ctx.restore();
    }
}


/**
 * Class for controlling the asteroids
 */
class Asteroid {
    pieceRadiusThreshold = 20;

    constructor(canvas, x, y, radius, color, movementVector) {
        this.canvas = canvas;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.movementVector = movementVector;
        this.rotationSpeed = Math.random() * 0.01 - 0.005;
        this.currentRotation = 0;
    }

    /**
     * Draws the asteroid
     */
    draw() {
        this.canvas.ctx.save();
        this.canvas.ctx.translate(this.x, this.y);
        this.canvas.ctx.rotate(this.currentRotation);
        const angle = Math.atan2(this.movementVector.y, this.movementVector.x);
        this.canvas.ctx.rotate(angle);
        this.canvas.ctx.drawImage(asteroidImage, -this.radius, -this.radius, this.radius * 2 + 10, this.radius * 2 + 10);
        this.canvas.ctx.restore();
    }

    /**
     * Updates the asteroid
     */
    update() {
        this.draw();
        this.x = this.x + this.movementVector.x;
        this.y = this.y + this.movementVector.y;
        this.currentRotation += this.rotationSpeed;
    }

    /**
     * Splits the asteroid into pieces
     * @returns {number[]|*[]} - list of pieces
     */
    splitAsteroidConfiguration() {
        if (this.radius < this.pieceRadiusThreshold) return [];

        const firstSize = (1 / 2) + (Math.random() * 0.2 - 0.1);

        return [firstSize, 1 - firstSize];
    }

    /**
     * Splits the asteroid into pieces
     * @returns {Asteroid[]} - list of new asteroids
     */
    splitAsteroidIntoPieces() {
        return this.splitAsteroidConfiguration().map((piece) => {
            const radius = this.radius * piece;
            const movementVector = {
                x: this.movementVector.x * (Math.random() * 0.4 + 0.6),
                y: this.movementVector.y * (Math.random() * 0.4 + 0.6)
            }
            const initialX = this.x + Math.random() * radius;
            const initialY = this.y + Math.random() * radius;
            return new Asteroid(this.canvas, initialX, initialY, radius, this.color, movementVector);
        });
    }
}

/**
 * Class for controlling the bullets
 */
class Bullet {
    color = '#64ffda';
    constructor(canvas, x, y, radius, vector, velocity) {
        this.canvas = canvas;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.vector = vector;
        this.velocity = velocity;
    }

    /**
     * Draws the bullet
     */
    draw() {
        this.canvas.ctx.beginPath();
        this.canvas.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        this.canvas.ctx.fillStyle = this.color;
        this.canvas.ctx.fill();
        this.canvas.ctx.closePath();
    }

    /**
     * Updates the bullet
     */
    update() {
        this.draw();
        this.x += this.vector.x * this.velocity;
        this.y += this.vector.y * this.velocity;
    }
}

class Ship {
    color = '#eeeeee';
    radius = 20;
    maxSpeed = 0.02;
    acceleration = 0.0008;
    deceleration = 0.0001;
    friction = 0.9925;
    rotationDegreePerCycle = 1.15;
    bulletRadius = 3;
    bulletFrequency = FPS/6;
    bulletVelocity = 5;
    lastBulletTime = this.bulletFrequency;

    constructor(canvas) {
        this.canvas = canvas;
        this.x = canvas.canvas.width / 2;
        this.y = canvas.canvas.height / 2;
        this.shipAngle = 0;
        this.movementVector = {
            x: 0,
            y: 0
        }
        this.speed = 0;
        this.keyPressed = {};
        this.bullets = [];

        this.addEventListeners();
    }

    /**
     * Draws the ship
     */
    draw() {
        this.canvas.ctx.save();
        this.canvas.ctx.translate(this.x, this.y);
        this.canvas.ctx.rotate(this.shipAngle);
        this.canvas.ctx.drawImage(spaceshipImage, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        if (this.keyPressed['ArrowUp']) {
            this.canvas.ctx.beginPath();
            this.canvas.ctx.fillStyle = '#9575cd';
            this.canvas.ctx.rotate(Math.PI / 6);
            this.canvas.ctx.fillRect(-7, this.radius + 10, 3, 10);
            this.canvas.ctx.rotate(-Math.PI / 6);
            this.canvas.ctx.fillRect(-1, this.radius + 10, 3, 10);
            this.canvas.ctx.rotate(-Math.PI / 6);
            this.canvas.ctx.fillRect(5, this.radius + 10, 3, 10);
            this.canvas.ctx.closePath();
        }
        this.canvas.ctx.restore();
    }

    /**
     * Updates the ship and the bullets
     */
    update() {
        if (this.keyPressed['ArrowUp']) {
            if (this.speed < this.maxSpeed) this.speed += this.acceleration;
            this.movementVector.x += Math.sin(this.shipAngle) * this.speed;
            this.movementVector.y += Math.cos(this.shipAngle) * this.speed;
        }

        if (this.keyPressed['ArrowDown']) {
            if (this.speed < this.maxSpeed) this.speed += this.deceleration;
            this.movementVector.x -= Math.sin(this.shipAngle) * this.speed;
            this.movementVector.y -= Math.cos(this.shipAngle) * this.speed;
        }

        if (this.keyPressed['ArrowLeft']) {
            this.shipAngle -= Math.PI / 180 * this.rotationDegreePerCycle;
        }

        if (this.keyPressed['ArrowRight']) {
            this.shipAngle += Math.PI / 180 * this.rotationDegreePerCycle;
        }

        if (this.keyPressed[' '] && this.lastBulletTime === this.bulletFrequency) {
            const bulletX = this.x + Math.sin(this.shipAngle) * this.radius;
            const bulletY = this.y - Math.cos(this.shipAngle) * this.radius;
            const bullet = new Bullet(this.canvas, bulletX, bulletY, this.bulletRadius, {
                x: Math.sin(this.shipAngle),
                y: -Math.cos(this.shipAngle)
            }, this.bulletVelocity);
            this.bullets.push(bullet);
            this.lastBulletTime = 0;
        }

        if (Math.abs(this.speed) < 0.0001) this.speed = 0;


        this.x += this.movementVector.x;
        this.y -= this.movementVector.y;

        if (this.x < 0) {
            this.canvas.generateMovingBackground();
            this.x = this.canvas.canvas.width;
        }
        if (this.x > this.canvas.canvas.width) {
            this.canvas.generateMovingBackground();
            this.x = 0;
        }
        if (this.y < 0) {
            this.canvas.generateMovingBackground();
            this.y = this.canvas.canvas.height;
        }
        if (this.y > this.canvas.canvas.height) {
            this.canvas.generateMovingBackground();
            this.y = 0;
        }

        this.movementVector.x *= this.friction;
        this.movementVector.y *= this.friction;

        this.bullets.forEach((bullet, index) => {
            bullet.update();
            if (bullet.x < 0 || bullet.x > this.canvas.canvas.width || bullet.y < 0 || bullet.y > this.canvas.canvas.height) {
                this.bullets.splice(index, 1);
            }
        });

        if (this.lastBulletTime < this.bulletFrequency) this.lastBulletTime += 1;

        this.draw();
    }

    /**
     * When a key is pressed, it is added to the list of pressed keys
     * @param event
     */
    keyDownEvent(event) {
        this.keyPressed[event.key] = true;
    }

    /**
     * When a key is released, it is removed from the list of pressed keys
     * @param event
     */
    keyUpEvent(event) {
        this.keyPressed[event.key] = false;
    }

    /**
     * Adds event listeners for key presses
     */
    addEventListeners() {
        this.keyPressed = {};
        document.addEventListener('keydown', this.keyDownEvent.bind(this));
        document.addEventListener('keyup', this.keyUpEvent.bind(this));
    }

    /**
     * Removes event listeners for key presses
     */
    removeEventListeners() {
        this.keyPressed = {};
        document.removeEventListener('keydown', this.keyDownEvent.bind(this));
        document.removeEventListener('keyup', this.keyUpEvent.bind(this));
    }

}

/**
 * Class for controlling the game
 */
class Game {
    startTime = Date.now();
    currentTime = 0;
    highScore = localStorage.getItem(localStorageHighScoreKey);

    constructor() {
        this.canvas = new Canvas(asteroidsCanvas, '#212121');
        this.canvas.update();
        this.showMenu();
    }

    /**
     * Checks if a bullet hit an asteroid and if so, splits the asteroid into pieces
     */
    checkIfBulletHitAsteroid() {
        this.ship.bullets.forEach((bullet, bulletIndex) => {
            this.asteroids.forEach((asteroid, asteroidIndex) => {
                const distance = Math.sqrt(Math.pow(bullet.x - asteroid.x, 2) + Math.pow(bullet.y - asteroid.y, 2));
                if (distance < bullet.radius + asteroid.radius) {
                    const pieces = asteroid.splitAsteroidIntoPieces();
                    this.ship.bullets.splice(bulletIndex, 1);
                    this.asteroids.splice(asteroidIndex, 1);
                    this.asteroids = this.asteroids.concat(pieces);
                }
            });
        });
    }

    /**
     * Checks if an asteroid hit the ship
     * @returns {boolean} - true if an asteroid hit the ship, false otherwise
     */
    checkIfAsteroidHitShip() {
        for (let i = 0; i < this.asteroids.length; i++) {
            const asteroid = this.asteroids[i];
            const distance = Math.sqrt(Math.pow(this.ship.x - asteroid.x, 2) + Math.pow(this.ship.y - asteroid.y, 2));
            if (distance < this.ship.radius + asteroid.radius) {
                return true;
            }
        }
    }

    /**
     * Checks if an asteroid is out of the canvas and if so, removes it
     */
    checkIfAsteroidOutOfCanvas() {
        for (let i = 0; i < this.asteroids.length; i++) {
            const asteroid = this.asteroids[i];
            if (asteroid.x < -100 || asteroid.x > this.canvas.canvas.width + 50 || asteroid.y < -100 || asteroid.y > this.canvas.canvas.height + 50) {
                this.asteroids.splice(i, 1);
            }
        }

        if (this.asteroids.length === 0) {
            this.generateAsteroids();
        }
    }

    /**
     * Generates a random position for an asteroid
     * @returns {{x: *, y: number}|{x: number, y: *}|{x: number, y: number}} - position of the asteroid
     */
    genAsteroidSpawnPosition() {
        const side = Math.floor(Math.random() * 4);
        const x = Math.random() * this.canvas.canvas.width;
        const y = Math.random() * this.canvas.canvas.height;
        switch (side) {
            case 0:
                return {x: -50, y};
            case 1:
                return {x: this.canvas.canvas.width + 50, y};
            case 2:
                return {x, y: -50};
            case 3:
                return {x, y: this.canvas.canvas.height + 50};
        }
    }

    /**
     * Generates asteroids with random positions and movement vectors depending on the time passed
     */
    generateAsteroids() {
        let n = Math.floor(Math.random() * 10) + 5;
        const timeDelta = Date.now() - this.startTime;
        if (timeDelta > 30000) n += 5;
        if (timeDelta > 60000) n += 5;
        if (timeDelta > 500000) n += 5;

        for (let i = 0; i < n; i++) {
            const {x, y} = this.genAsteroidSpawnPosition();
            const radius = Math.random() * 50 + 25;

            const movementVector = {
                x: (this.canvas.canvas.width / 2 - x) / 1000 + Math.random() - 0.5,
                y: (this.canvas.canvas.height / 2 - y) / 1000 + Math.random() - 0.5
            }
            this.asteroids.push(new Asteroid(this.canvas, x, y, radius, '#eeeeee', movementVector));
        }
    }

    /**
     * Shows the game over dialog
     */
    showGameOverDialog() {
        mainMenuDialog.close();
        gameOverDialog.show();
    }

    /**
     * Shows the main menu dialog
     */
    showMenu() {
        this.updateHighScore();
        gameOverDialog.close();
        mainMenuDialog.show();
    }

    /**
     * Updates the high score
     */
    updateHighScore() {
        this.highScore = localStorage.getItem(localStorageHighScoreKey);
        if (this.highScore) {
            const minutes = Math.floor(this.highScore / 60000);
            const seconds = Math.floor(this.highScore / 1000) % 60;
            const milliseconds = this.highScore % 1000;
            highScoreElement.innerHTML = `Best Time: ${minutes}:${Math.floor(seconds)}.${milliseconds}`;
        }
    }

    /**
     * Updates the current time and the high score
     * @param inputTime - time to update
     */
    updateTimes(inputTime) {
        let hsText = 'Best Time: -';
        if (this.highScore) {
            const minutes = Math.floor(this.highScore / 60000);
            const seconds = Math.floor(this.highScore / 1000) % 60;
            const milliseconds = this.highScore % 1000;
            hsText = `Best Time: ${minutes}:${Math.floor(seconds)}.${milliseconds}`;
        }
        const time = inputTime || Date.now() - this.startTime;
        this.currentTime = time;
        const minutes = Math.floor(time / 60000);
        const seconds = Math.floor(time / 1000) % 60;
        const milliseconds = time % 1000;
        const currentScoreText = `Time: ${minutes}:${seconds}.${milliseconds}`;
        this.canvas.drawCurrentTime(currentScoreText);
        this.canvas.drawHighScore(hsText);
    }

    /**
     * Starts a new game
     */
    newGame() {
        gameOverDialog.close();
        mainMenuDialog.close();
        this.ship = new Ship(this.canvas);
        this.asteroids = [];
        this.generateAsteroids();
        this.startTime = Date.now();
        this.game();
    }

    /**
     * Ends the game
     */
    endGame() {
        const time = Date.now() - this.startTime;
        this.ship.removeEventListeners();
        this.highScore = localStorage.getItem(localStorageHighScoreKey);
        if (!this.highScore || this.highScore < time) {
            localStorage.setItem(localStorageHighScoreKey, time);
            this.highScore = time;
        }
        this.canvas.update();
        this.updateTimes();
        this.ship.update();
        this.asteroids.forEach(asteroid => asteroid.update());
        this.updateHighScore();
        this.showGameOverDialog();
    }

    /**
     * Main game loop
     * Updates the canvas, the ship, the asteroids and checks if the game is over
     */
    game() {
        this.canvas.update();
        this.updateTimes();
        this.ship.update();
        this.checkIfBulletHitAsteroid();
        this.checkIfAsteroidOutOfCanvas();
        this.asteroids.forEach(asteroid => asteroid.update());

        if (this.checkIfAsteroidHitShip()) {
            this.endGame();
            return;
        }

        setTimeout(() => {
                requestAnimationFrame(this.game.bind(this));
                }, 1000 / FPS);
    }
}

const game = new Game();

