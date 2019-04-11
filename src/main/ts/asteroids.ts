'use strict';

/*
 * Asteroids game written in TypeScript and using the Phaser CE game framework.
 *
 * Keith Rieck, 2018.
 */

/** The application class for this demo. */
class AsteroidsApp {

    game: Phaser.Game;
    scoreValue: number = 0;
    scorePrev: number = null;

    constructor(width: number, height: number, divId: string) {
        var isIE11 = !!navigator.userAgent.match(/Trident.*rv[ :]*11\./);
        var renderer = isIE11 ? Phaser.CANVAS : Phaser.AUTO;
        this.game = new Phaser.Game(width, height, renderer, divId);
        this.game['app'] = this;
        this.game.state.add('waitingState', new WaitingState(this.game, this));
        this.game.state.add('runningState', new RunningState(this.game, this));
        this.game.state.start('waitingState');
    }
}

/** Game state when waiting for play to begin. */
class WaitingState extends Phaser.State {
    private _app: AsteroidsApp;
    message1Text: Phaser.Text;
    message2Text: Phaser.Text;

    constructor(g: Phaser.Game, app: any) {
        super();
        this.game = g;
        this._app = app;
    }

    preload() {
        this.game.load.image('background', 'assets/background.png');
        this.game.load.image('bullet', 'assets/bullet.png');
        this.game.load.atlasJSONHash('ship', 'assets/ship.png', 'assets/ship.json');
        this.game.load.atlasJSONHash('asteroid', 'assets/asteroid.png', 'assets/asteroid.json');
        this.game.load.audio('blaster', 'assets/blaster.mp3');
        this.game.load.audio('explosion', 'assets/explosion.mp3');
    }

    create() {
        this.game.physics.startSystem(Phaser.Physics.ARCADE);
        this.game.add.tileSprite(0, 0, this.game.width, this.game.height, 'background');
        this.message1Text = this.game.add.text(this.game.width / 2 - 100, this.game.height / 2, '', { fill: '#00FF00' });
        this.message1Text.fontSize = 24;
        this.message1Text.text = 'Press Space to start';
        this.message2Text = this.game.add.text(this.game.width / 2 - 100, this.game.height / 2 - 32, '', { fill: '#00FF00' });
        this.message2Text.fontSize = 24;
        this.message2Text.text = (this._app.scorePrev) ? 'Your score is ' + this._app.scorePrev : '';
        this.game.input.keyboard.addKeyCapture([Phaser.Keyboard.SPACEBAR]);
    }

    update() {
        if (this.game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
            this.message1Text.text = '';
            this.game.state.start('runningState');
        }
    }
}

/** Game state while playing. */
class RunningState extends Phaser.State {
    private _app: AsteroidsApp;
    ship: ShipSprite;
    bulletGroup: BulletGroup;
    asteroidGroup: AsteroidGroup;
    cursors: any;
    scoreText: Phaser.Text;
    livesValue: number = 3;
    livesIcon: any = [];

    constructor(g: Phaser.Game, app: any) {
        super();
        this.game = g;
        this._app = app;
    }

    create() {
        this.game.physics.startSystem(Phaser.Physics.ARCADE);
        this.game.add.tileSprite(0, 0, this.game.width, this.game.height, 'background');

        this.ship = new ShipSprite(this.game, this.game.width / 2, this.game.height / 2);
        this.ship.angle = -90;
        this.game.world.addChild(this.ship);

        this.bulletGroup = new BulletGroup(this.game, 3);
        this.ship.bulletGroup = this.bulletGroup;

        this.asteroidGroup = new AsteroidGroup(this.game, 25);
        this.game['app'].asteroidGroup = this.asteroidGroup;

        this.livesValue = 3;
        this.livesIcon = [];
        for (let i = 0; i < this.livesValue - 1; i++) {
            let s = new Phaser.Sprite(this.game, 16 + i * this.ship.width / 2, 16, 'ship', 'shipNormal');
            s.anchor.set(0.5);
            s.width = this.ship.width / 2;
            s.height = this.ship.height / 2;
            s.angle = -90;
            this.livesIcon.push(s);
            this.game.world.addChild(s);
        }

        this._app.scoreValue = 0;
        this.scoreText = this.game.add.text(60, 8, '' + this._app.scoreValue, { fill: '#00FF00' });
        this.scoreText.align = 'right';
        this.scoreText.fontSize = 18;

        this.cursors = this.game.input.keyboard.createCursorKeys();
        this.game.input.keyboard.addKeyCapture([Phaser.Keyboard.SPACEBAR]);
    }

    update() {
        this.ship.thrust = this.cursors.up.isDown;
        this.ship.shields = this.cursors.down.isDown;
        this.ship.turn = this.cursors.left.isDown ? Turn.LEFT
            : this.cursors.right.isDown ? Turn.RIGHT
                : Turn.STRAIGHT;
        if (this.game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
            this.ship.fireBullet();
        }
        this.scoreText.text = '' + this._app.scoreValue;

        this.game.physics.arcade.collide(this.bulletGroup.children, this.asteroidGroup.children,
            function bulletHitsAsteroid(b: any, a: any) {
                a.game['app'].scoreValue += a.score;
                b.kill();
                a.kill();
            });
        this.game.physics.arcade.collide(this.ship, this.asteroidGroup.children,
            function shipHitsAsteroid(s: any, a: any) {
                a.kill();
                s.kill();
            });

        if (this.asteroidGroup.countLiving() == 0) {
            let count = (this._app.scoreValue < 1000) ? 3 : (this._app.scoreValue < 4000 ? 4 : 6);
            for (let i = 0; i < count; i++) {
                let a = this.asteroidGroup.getFirstExists(false);
                a.reset(this.game.rnd.integerInRange(0, this.game.width),
                    this.game.rnd.integerInRange(0, this.game.height),
                    AsteroidSize.ASTEROID_LARGE);
            }
        }

        if (!this.ship.alive) {
            this.livesValue--;
            if (this.livesValue <= 0) {
                this._app.scorePrev = this._app.scoreValue;
                this.game.state.start('waitingState');
            } else {
                this.ship.reset(this.game.width / 2, this.game.height / 2);
                for (let i = 0; i < this.livesIcon.length; i++) {
                    this.livesIcon[i].visible = ((i + 1) < this.livesValue);
                }
            }
        }
    }

}

enum Turn { LEFT, RIGHT, STRAIGHT }

/** Class representing the player's ship. */
class ShipSprite extends Phaser.Sprite {
    private _thrust: Boolean = false;
    private _shields: Boolean = false;
    private _turn: Turn = Turn.STRAIGHT;
    private _bulletTime: number = 0;
    private _blasterSound: Phaser.Sound;
    private _explosionSound: Phaser.Sound;
    bulletGroup: BulletGroup;

    constructor(game: Phaser.Game, x: number, y: number) {
        super(game, x, y, 'ship', 'shipNormal');
        this.anchor.set(0.5);
        this.game.physics.enable(this, Phaser.Physics.ARCADE);
        this.body.drag.set(20);
        this.body.maxVelocity.set(200);
        this._blasterSound = this.game.add.audio('blaster');
        this._blasterSound.volume = 0.4;
        this._explosionSound = this.game.add.audio('explosion');
    }

    set thrust(b: Boolean) {
        this._thrust = b;
        if (this._thrust) {
            this.game.physics.arcade.accelerationFromRotation(this.rotation,
                200, this.body.acceleration);
        } else {
            this.body.acceleration.set(0);
        }
        this.frameName = (this._thrust && this._shields) ? 'shipThrustShields'
            : this._thrust ? 'shipThrust'
                : this._shields ? 'shipShields' : 'shipNormal';
    }

    get thrust(): Boolean {
        return this._thrust;
    }

    set turn(d: Turn) {
        this._turn = d;
        if (this._turn === Turn.LEFT) {
            this.body.angularVelocity = -300;
        } else if (this._turn === Turn.RIGHT) {
            this.body.angularVelocity = 300;
        } else {
            this.body.angularVelocity = 0;
        }
    }

    get turn(): Turn {
        return this._turn;
    }

    set shields(b: Boolean) {
        this._shields = b;
        this.frameName = (this._thrust && this._shields) ? 'shipThrustShields'
            : this._thrust ? 'shipThrust'
                : this._shields ? 'shipShields' : 'shipNormal';
    }

    get shields(): Boolean {
        return this._shields;
    }

    fireBullet() {
        if (this.game.time.now > this._bulletTime) {
            let bullet = this.bulletGroup.getFirstExists(false);
            if (bullet) {
                bullet.reset(this.body.x + 16, this.body.y + 16);
                bullet.lifespan = 1000;
                bullet.rotation = this.rotation;
                this.game.physics.arcade.velocityFromRotation(this.rotation, 400,
                    bullet.body.velocity);
                this._bulletTime = this.game.time.now + 150;
                this._blasterSound.play();
            }
        }
    }

    update() {
        super.update();
        screenWrap(this);
    }
}

/** Class representing a bullet fired from the ship */
class BulletSprite extends Phaser.Sprite {
    constructor(game: Phaser.Game, x: number, y: number) {
        super(game, x, y, 'bullet');
        this.anchor.set(0.5);
        this.game.physics.enable(this, Phaser.Physics.ARCADE);
    }

    update() {
        super.update();
        screenWrap(this);
    }
}

/** A group of BulletSprite objects. */
class BulletGroup extends Phaser.Group {
    constructor(game: Phaser.Game, num: number) {
        super(game, game.world, 'BulletGroup', null, true, Phaser.Physics.ARCADE);
        this.classType = BulletSprite;
        if (num) { super.createMultiple(num, null, null, false); }
    }
}

enum AsteroidSize { ASTEROID_LARGE = 20, ASTEROID_MEDIUM = 40, ASTEROID_SMALL = 60 }

/** Class representing an asteroid */
class AsteroidSprite extends Phaser.Sprite {
    private _size: AsteroidSize;
    private _explosionSound: Phaser.Sound;

    constructor(game: Phaser.Game, x: number, y: number, aSize: AsteroidSize) {
        super(game, x, y, 'asteroid', AsteroidSize[((aSize == undefined) ? AsteroidSize.ASTEROID_LARGE : aSize)]);
        this._size = ((aSize == undefined) ? AsteroidSize.ASTEROID_LARGE : aSize);
        let angle = game.rnd.integerInRange(-180, 180);
        this.anchor.set(0.5);
        this.game.physics.enable(this, Phaser.Physics.ARCADE);
        this.game.physics.arcade.velocityFromAngle(angle, aSize);
        this._explosionSound = this.game.add.audio('explosion');
    }

    reset(xx: number, yy: number, aSize: number): Phaser.Sprite {
        super.reset(xx, yy, 1);
        this.rotation = this.game.rnd.angle();
        this.game.physics.arcade.velocityFromRotation(this.game.rnd.angle(), aSize, this.body.velocity);
        this.body.angularVelocity = this.game.rnd.integerInRange(-10, 10);
        this.frameName = AsteroidSize[aSize];
        this._size = aSize;
        this.body.width = this.width;
        this.body.height = this.height;
        return this;
    }

    update() {
        super.update();
        screenWrap(this);
    }

    get size(): AsteroidSize {
        return this._size;
    }

    get score(): number {
        if (this._size == AsteroidSize.ASTEROID_LARGE) { return 20; }
        if (this._size == AsteroidSize.ASTEROID_MEDIUM) { return 50; }
        return 100;
    }

    kill(): Phaser.Sprite {
        let nextSize: AsteroidSize = null;
        if (this._size === AsteroidSize.ASTEROID_LARGE) {
            nextSize = AsteroidSize.ASTEROID_MEDIUM;
        } else if (this._size === AsteroidSize.ASTEROID_MEDIUM) {
            nextSize = AsteroidSize.ASTEROID_SMALL;
        }
        if (nextSize) {
            let group: Phaser.Group = this.game['app'].asteroidGroup;
            let a1 = group.getFirstExists(false);
            if (a1) { a1.reset(this.x, this.y, nextSize); }
            let a2 = group.getFirstExists(false);
            if (a2) { a2.reset(this.x, this.y, nextSize); }
        }
        this._explosionSound.play();
        return super.kill();
    }
}

/** A group of AsteroidGroup objects. */
class AsteroidGroup extends Phaser.Group {
    constructor(game: Phaser.Game, num: number) {
        super(game, game.world, 'AsteroidGroup', null, true, Phaser.Physics.ARCADE);
        this.classType = AsteroidSprite;
        if (num) { super.createMultiple(num, null, null, false); }
    }
}


/**
 * Allow a Sprite to pass from one edge of the screen across to the opposite side.
 */
function screenWrap(sprite: Phaser.Sprite) {
    if (sprite.x < 0) {
        sprite.x = sprite.game.width;
    } else if (sprite.x > sprite.game.width) {
        sprite.x = 0;
    }

    if (sprite.y < 0) {
        sprite.y = sprite.game.height;
    } else if (sprite.y > sprite.game.height) {
        sprite.y = 0;
    }
}

