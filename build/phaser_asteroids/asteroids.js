'use strict';
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/*
 * Asteroids game written in TypeScript and using the Phaser CE game framework.
 *
 * Keith Rieck, 2018.
 */
/** The application class for this demo. */
var AsteroidsApp = (function () {
    function AsteroidsApp(width, height, divId) {
        this.scoreValue = 0;
        this.scorePrev = null;
        var isIE11 = !!navigator.userAgent.match(/Trident.*rv[ :]*11\./);
        var renderer = isIE11 ? Phaser.CANVAS : Phaser.AUTO;
        this.game = new Phaser.Game(width, height, renderer, divId);
        this.game['app'] = this;
        this.game.state.add('waitingState', new WaitingState(this.game, this));
        this.game.state.add('runningState', new RunningState(this.game, this));
        this.game.state.start('waitingState');
    }
    return AsteroidsApp;
}());
/** Game state when waiting for play to begin. */
var WaitingState = (function (_super) {
    __extends(WaitingState, _super);
    function WaitingState(g, app) {
        _super.call(this);
        this.game = g;
        this._app = app;
    }
    WaitingState.prototype.preload = function () {
        this.game.load.image('background', 'assets/background.png');
        this.game.load.image('bullet', 'assets/bullet.png');
        this.game.load.atlasJSONHash('ship', 'assets/ship.png', 'assets/ship.json');
        this.game.load.atlasJSONHash('asteroid', 'assets/asteroid.png', 'assets/asteroid.json');
        this.game.load.audio('blaster', 'assets/blaster.mp3');
        this.game.load.audio('explosion', 'assets/explosion.mp3');
    };
    WaitingState.prototype.create = function () {
        this.game.physics.startSystem(Phaser.Physics.ARCADE);
        this.game.add.tileSprite(0, 0, this.game.width, this.game.height, 'background');
        this.message1Text = this.game.add.text(this.game.width / 2 - 100, this.game.height / 2, '', { fill: '#00FF00' });
        this.message1Text.fontSize = 24;
        this.message1Text.text = 'Press Space to start';
        this.message2Text = this.game.add.text(this.game.width / 2 - 100, this.game.height / 2 - 32, '', { fill: '#00FF00' });
        this.message2Text.fontSize = 24;
        this.message2Text.text = (this._app.scorePrev) ? 'Your score is ' + this._app.scorePrev : '';
        this.game.input.keyboard.addKeyCapture([Phaser.Keyboard.SPACEBAR]);
    };
    WaitingState.prototype.update = function () {
        if (this.game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
            this.message1Text.text = '';
            this.game.state.start('runningState');
        }
    };
    return WaitingState;
}(Phaser.State));
/** Game state while playing. */
var RunningState = (function (_super) {
    __extends(RunningState, _super);
    function RunningState(g, app) {
        _super.call(this);
        this.livesValue = 3;
        this.livesIcon = [];
        this.game = g;
        this._app = app;
    }
    RunningState.prototype.create = function () {
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
        for (var i = 0; i < this.livesValue - 1; i++) {
            var s = new Phaser.Sprite(this.game, 16 + i * this.ship.width / 2, 16, 'ship', 'shipNormal');
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
    };
    RunningState.prototype.update = function () {
        this.ship.thrust = this.cursors.up.isDown;
        this.ship.shields = this.cursors.down.isDown;
        this.ship.turn = this.cursors.left.isDown ? Turn.LEFT
            : this.cursors.right.isDown ? Turn.RIGHT
                : Turn.STRAIGHT;
        if (this.game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
            this.ship.fireBullet();
        }
        this.scoreText.text = '' + this._app.scoreValue;
        this.game.physics.arcade.collide(this.bulletGroup.children, this.asteroidGroup.children, function bulletHitsAsteroid(b, a) {
            a.game['app'].scoreValue += a.score;
            b.kill();
            a.kill();
        });
        this.game.physics.arcade.collide(this.ship, this.asteroidGroup.children, function shipHitsAsteroid(s, a) {
            a.kill();
            s.kill();
        });
        if (this.asteroidGroup.countLiving() == 0) {
            var count = (this._app.scoreValue < 1000) ? 3 : (this._app.scoreValue < 4000 ? 4 : 6);
            for (var i = 0; i < count; i++) {
                var a = this.asteroidGroup.getFirstExists(false);
                a.reset(this.game.rnd.integerInRange(0, this.game.width), this.game.rnd.integerInRange(0, this.game.height), AsteroidSize.ASTEROID_LARGE);
            }
        }
        if (!this.ship.alive) {
            this.livesValue--;
            if (this.livesValue <= 0) {
                this._app.scorePrev = this._app.scoreValue;
                this.game.state.start('waitingState');
            }
            else {
                this.ship.reset(this.game.width / 2, this.game.height / 2);
                for (var i = 0; i < this.livesIcon.length; i++) {
                    this.livesIcon[i].visible = ((i + 1) < this.livesValue);
                }
            }
        }
    };
    return RunningState;
}(Phaser.State));
var Turn;
(function (Turn) {
    Turn[Turn["LEFT"] = 0] = "LEFT";
    Turn[Turn["RIGHT"] = 1] = "RIGHT";
    Turn[Turn["STRAIGHT"] = 2] = "STRAIGHT";
})(Turn || (Turn = {}));
/** Class representing the player's ship. */
var ShipSprite = (function (_super) {
    __extends(ShipSprite, _super);
    function ShipSprite(game, x, y) {
        _super.call(this, game, x, y, 'ship', 'shipNormal');
        this._thrust = false;
        this._shields = false;
        this._turn = Turn.STRAIGHT;
        this._bulletTime = 0;
        this.anchor.set(0.5);
        this.game.physics.enable(this, Phaser.Physics.ARCADE);
        this.body.drag.set(20);
        this.body.maxVelocity.set(200);
        this._blasterSound = this.game.add.audio('blaster');
        this._blasterSound.volume = 0.4;
        this._explosionSound = this.game.add.audio('explosion');
    }
    Object.defineProperty(ShipSprite.prototype, "thrust", {
        get: function () {
            return this._thrust;
        },
        set: function (b) {
            this._thrust = b;
            if (this._thrust) {
                this.game.physics.arcade.accelerationFromRotation(this.rotation, 200, this.body.acceleration);
            }
            else {
                this.body.acceleration.set(0);
            }
            this.frameName = (this._thrust && this._shields) ? 'shipThrustShields'
                : this._thrust ? 'shipThrust'
                    : this._shields ? 'shipShields' : 'shipNormal';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ShipSprite.prototype, "turn", {
        get: function () {
            return this._turn;
        },
        set: function (d) {
            this._turn = d;
            if (this._turn === Turn.LEFT) {
                this.body.angularVelocity = -300;
            }
            else if (this._turn === Turn.RIGHT) {
                this.body.angularVelocity = 300;
            }
            else {
                this.body.angularVelocity = 0;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ShipSprite.prototype, "shields", {
        get: function () {
            return this._shields;
        },
        set: function (b) {
            this._shields = b;
            this.frameName = (this._thrust && this._shields) ? 'shipThrustShields'
                : this._thrust ? 'shipThrust'
                    : this._shields ? 'shipShields' : 'shipNormal';
        },
        enumerable: true,
        configurable: true
    });
    ShipSprite.prototype.fireBullet = function () {
        if (this.game.time.now > this._bulletTime) {
            var bullet = this.bulletGroup.getFirstExists(false);
            if (bullet) {
                bullet.reset(this.body.x + 16, this.body.y + 16);
                bullet.lifespan = 1000;
                bullet.rotation = this.rotation;
                this.game.physics.arcade.velocityFromRotation(this.rotation, 400, bullet.body.velocity);
                this._bulletTime = this.game.time.now + 150;
                this._blasterSound.play();
            }
        }
    };
    ShipSprite.prototype.update = function () {
        _super.prototype.update.call(this);
        screenWrap(this);
    };
    return ShipSprite;
}(Phaser.Sprite));
/** Class representing a bullet fired from the ship */
var BulletSprite = (function (_super) {
    __extends(BulletSprite, _super);
    function BulletSprite(game, x, y) {
        _super.call(this, game, x, y, 'bullet');
        this.anchor.set(0.5);
        this.game.physics.enable(this, Phaser.Physics.ARCADE);
    }
    BulletSprite.prototype.update = function () {
        _super.prototype.update.call(this);
        screenWrap(this);
    };
    return BulletSprite;
}(Phaser.Sprite));
/** A group of BulletSprite objects. */
var BulletGroup = (function (_super) {
    __extends(BulletGroup, _super);
    function BulletGroup(game, num) {
        _super.call(this, game, game.world, 'BulletGroup', null, true, Phaser.Physics.ARCADE);
        this.classType = BulletSprite;
        if (num) {
            _super.prototype.createMultiple.call(this, num, null, null, false);
        }
    }
    return BulletGroup;
}(Phaser.Group));
var AsteroidSize;
(function (AsteroidSize) {
    AsteroidSize[AsteroidSize["ASTEROID_LARGE"] = 20] = "ASTEROID_LARGE";
    AsteroidSize[AsteroidSize["ASTEROID_MEDIUM"] = 40] = "ASTEROID_MEDIUM";
    AsteroidSize[AsteroidSize["ASTEROID_SMALL"] = 60] = "ASTEROID_SMALL";
})(AsteroidSize || (AsteroidSize = {}));
/** Class representing an asteroid */
var AsteroidSprite = (function (_super) {
    __extends(AsteroidSprite, _super);
    function AsteroidSprite(game, x, y, aSize) {
        _super.call(this, game, x, y, 'asteroid', AsteroidSize[((aSize == undefined) ? AsteroidSize.ASTEROID_LARGE : aSize)]);
        this._size = ((aSize == undefined) ? AsteroidSize.ASTEROID_LARGE : aSize);
        var angle = game.rnd.integerInRange(-180, 180);
        this.anchor.set(0.5);
        this.game.physics.enable(this, Phaser.Physics.ARCADE);
        this.game.physics.arcade.velocityFromAngle(angle, aSize);
        this._explosionSound = this.game.add.audio('explosion');
    }
    AsteroidSprite.prototype.reset = function (xx, yy, aSize) {
        _super.prototype.reset.call(this, xx, yy, 1);
        this.rotation = this.game.rnd.angle();
        this.game.physics.arcade.velocityFromRotation(this.game.rnd.angle(), aSize, this.body.velocity);
        this.body.angularVelocity = this.game.rnd.integerInRange(-10, 10);
        this.frameName = AsteroidSize[aSize];
        this._size = aSize;
        this.body.width = this.width;
        this.body.height = this.height;
        return this;
    };
    AsteroidSprite.prototype.update = function () {
        _super.prototype.update.call(this);
        screenWrap(this);
    };
    Object.defineProperty(AsteroidSprite.prototype, "size", {
        get: function () {
            return this._size;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AsteroidSprite.prototype, "score", {
        get: function () {
            if (this._size == AsteroidSize.ASTEROID_LARGE) {
                return 20;
            }
            if (this._size == AsteroidSize.ASTEROID_MEDIUM) {
                return 50;
            }
            return 100;
        },
        enumerable: true,
        configurable: true
    });
    AsteroidSprite.prototype.kill = function () {
        var nextSize = null;
        if (this._size === AsteroidSize.ASTEROID_LARGE) {
            nextSize = AsteroidSize.ASTEROID_MEDIUM;
        }
        else if (this._size === AsteroidSize.ASTEROID_MEDIUM) {
            nextSize = AsteroidSize.ASTEROID_SMALL;
        }
        if (nextSize) {
            var group = this.game['app'].asteroidGroup;
            var a1 = group.getFirstExists(false);
            if (a1) {
                a1.reset(this.x, this.y, nextSize);
            }
            var a2 = group.getFirstExists(false);
            if (a2) {
                a2.reset(this.x, this.y, nextSize);
            }
        }
        this._explosionSound.play();
        return _super.prototype.kill.call(this);
    };
    return AsteroidSprite;
}(Phaser.Sprite));
/** A group of AsteroidGroup objects. */
var AsteroidGroup = (function (_super) {
    __extends(AsteroidGroup, _super);
    function AsteroidGroup(game, num) {
        _super.call(this, game, game.world, 'AsteroidGroup', null, true, Phaser.Physics.ARCADE);
        this.classType = AsteroidSprite;
        if (num) {
            _super.prototype.createMultiple.call(this, num, null, null, false);
        }
    }
    return AsteroidGroup;
}(Phaser.Group));
/**
 * Allow a Sprite to pass from one edge of the screen across to the opposite side.
 */
function screenWrap(sprite) {
    if (sprite.x < 0) {
        sprite.x = sprite.game.width;
    }
    else if (sprite.x > sprite.game.width) {
        sprite.x = 0;
    }
    if (sprite.y < 0) {
        sprite.y = sprite.game.height;
    }
    else if (sprite.y > sprite.game.height) {
        sprite.y = 0;
    }
}
