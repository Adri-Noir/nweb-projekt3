

const localStorageHighScoreKey = 'asteroids-high-score';
const FPS = 120;
const asteroidsCanvas = document.getElementById('asteroids-canvas');
const spaceshipImage = document.getElementById('spaceship');
const asteroidImage = document.getElementById('asteroid');
const gameOverDialog = document.getElementById('game-over');
const mainMenuDialog = document.getElementById('main-menu');
const highScoreElement = document.getElementById('high-score');
const highScoreTop = document.getElementById('high-score-top');
const currentTimeElement = document.getElementById('current-time');

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

    generateMovingBackground() {
        this.stars = this._generateMovingBackground();
    }

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

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    update() {
        this.clear();
        this.fill();
    }
}


class Asteroid {
    pieceRadiusThreshold = 20;

    constructor(canvas, x, y, radius, color, movementVector) {
        this.canvas = canvas;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.movementVector = movementVector;
    }

    draw() {
        this.canvas.ctx.save();
        this.canvas.ctx.translate(this.x, this.y);
        const angle = Math.atan2(this.movementVector.y, this.movementVector.x);
        this.canvas.ctx.rotate(angle);
        this.canvas.ctx.drawImage(asteroidImage, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        this.canvas.ctx.restore();
    }

    update() {
        this.draw();
        this.x = this.x + this.movementVector.x;
        this.y = this.y + this.movementVector.y;
    }

    splitAsteroidConfiguration() {
        if (this.radius < this.pieceRadiusThreshold) return [];

        const firstSize = (1 / 2) + (Math.random() * 0.2 - 0.1);

        return [firstSize, 1 - firstSize];
    }

    //TODO: fix angle of pieces
    splitAsteroidIntoPieces() {
        return this.splitAsteroidConfiguration().map((piece) => {
            const radius = this.radius * piece;
            const movementVector = {
                x: this.movementVector.x + Math.random(),
                y: this.movementVector.y + Math.random()
            }
            const initialX = this.x + Math.random() * radius;
            const initialY = this.y + Math.random() * radius;
            return new Asteroid(this.canvas, initialX, initialY, radius, this.color, movementVector);
        });
    }
}

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

    draw() {
        this.canvas.ctx.beginPath();
        this.canvas.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        this.canvas.ctx.fillStyle = this.color;
        this.canvas.ctx.fill();
        this.canvas.ctx.closePath();
    }

    update() {
        this.draw();
        this.x = this.x + this.vector.x * this.velocity;
        this.y = this.y + this.vector.y * this.velocity;
    }
}

class Ship {
    color = '#eeeeee';
    radius = 20;
    maxSpeed = 0.02;
    acceleration = 0.00075;
    deceleration = 0.0001;
    friction = 0.9925;
    rotationDegreePerCycle = 1.15;
    bulletRadius = 3;
    bulletFrequency = FPS/5;
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

    // TODO: maybe improve collision detection
    draw() {
        this.canvas.ctx.save();
        this.canvas.ctx.translate(this.x, this.y);
        this.canvas.ctx.rotate(this.shipAngle);
        this.canvas.ctx.drawImage(spaceshipImage, -this.radius - 2.5, -this.radius - 2.5, this.radius * 2 + 5, this.radius * 2 + 5);
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
            const bullet = new Bullet(this.canvas, this.x, this.y, this.bulletRadius, {
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

    keyDownEvent(event) {
        this.keyPressed[event.key] = true;
    }

    keyUpEvent(event) {
        this.keyPressed[event.key] = false;
    }

    addEventListeners() {
        this.keyPressed = {};
        document.addEventListener('keydown', this.keyDownEvent.bind(this));
        document.addEventListener('keyup', this.keyUpEvent.bind(this));
    }

    removeEventListeners() {
        this.keyPressed = {};
        document.removeEventListener('keydown', this.keyDownEvent.bind(this));
        document.removeEventListener('keyup', this.keyUpEvent.bind(this));
    }

}

class Game {
    startTime = Date.now();
    timeCounterInterval = null;
    currentTime = 0;

    constructor() {
        this.canvas = new Canvas(asteroidsCanvas, '#212121');
        this.canvas.update();
        this.showMenu();
    }

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

    checkIfAsteroidHitShip() {
        for (let i = 0; i < this.asteroids.length; i++) {
            const asteroid = this.asteroids[i];
            const distance = Math.sqrt(Math.pow(this.ship.x - asteroid.x, 2) + Math.pow(this.ship.y - asteroid.y, 2));
            if (distance < this.ship.radius + asteroid.radius) {
                return true;
            }
        }
    }

    checkIfAsteroidOutOfCanvas() {
        for (let i = 0; i < this.asteroids.length; i++) {
            const asteroid = this.asteroids[i];
            if (asteroid.x < -100 || asteroid.x > this.canvas.canvas.width + 50 || asteroid.y < -100 || asteroid.y > this.canvas.canvas.height + 50) {
                this.asteroids.splice(i, 1);
            }
        }

        if (this.asteroids.length === 0) {
            this.generateAsteroid(6);
        }
    }

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

    // TODO: improve level generation
    generateAsteroid(n) {
        for (let i = 0; i < n; i++) {
            const {x, y} = this.genAsteroidSpawnPosition();
            const radius = Math.random() * 50 + 25;

            const movementVector = {
                x: (this.canvas.canvas.width / 2 - x) / 1000 + Math.random() * 0.5 - 0.25,
                y: (this.canvas.canvas.height / 2 - y) / 1000 + Math.random() * 0.5 - 0.25
            }
            this.asteroids.push(new Asteroid(this.canvas, x, y, radius, '#eeeeee', movementVector));
        }
    }

    showGameOverDialog() {
        mainMenuDialog.close();
        gameOverDialog.show();
    }

    showMenu() {
        this.updateHighScore();
        gameOverDialog.close();
        mainMenuDialog.show();
    }

    updateHighScore() {
        const highScore = localStorage.getItem(localStorageHighScoreKey);
        if (highScore) {
            const minutes = Math.floor(highScore / 60000);
            const seconds = Math.floor(highScore / 1000) % 60;
            const milliseconds = highScore % 1000;
            const bestTime = `Best Time: ${minutes}:${Math.floor(seconds)}.${milliseconds}`
            highScoreElement.innerHTML = bestTime;
            highScoreTop.innerHTML = bestTime;
        }
    }

    updateCurrentTime(inputTime) {
        const time = inputTime || Date.now() - this.startTime;
        this.currentTime = time;
        const minutes = Math.floor(time / 60000);
        const seconds = Math.floor(time / 1000) % 60;
        const milliseconds = time % 1000;
        currentTimeElement.innerHTML = `Current Time: ${minutes}:${seconds}.${milliseconds}`;
    }

    newGame() {
        gameOverDialog.close();
        mainMenuDialog.close();
        this.ship = new Ship(this.canvas);
        this.asteroids = [];
        this.generateAsteroid(2);
        this.startTime = Date.now();
        this.timeCounterInterval = setInterval(this.updateCurrentTime.bind(this), 50);
        this.game();
    }

    endGame() {
        clearInterval(this.timeCounterInterval);
        const time = Date.now() - this.startTime;
        this.ship.removeEventListeners();
        const highScore = localStorage.getItem(localStorageHighScoreKey);
        if (!highScore || highScore < time) {
            localStorage.setItem(localStorageHighScoreKey, time);
        }
        this.updateCurrentTime(time);
        this.updateHighScore();
        this.showGameOverDialog();
    }

    game() {
        this.canvas.update();
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

