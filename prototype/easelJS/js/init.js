/*
	TODO:

	1. Missile
		a. speed fixed to ship speed
		b. layering below player
	2. Touch controls update
		a. Manual threshold
		b. Fire while navigating
	3. Asteroids
		a. Render
		b. Update
*/

/************************************/
/** ------ EaselJS additions------ **/
/************************************/
createjs.Graphics.prototype.dashedLineTo = function(x1, y1, x2, y2, dashLen) {
    this.moveTo(x1, y1);
    
    var dX = x2 - x1;
    var dY = y2 - y1;
    var dashes = Math.floor(Math.sqrt(dX * dX + dY * dY) / dashLen);
    var dashX = dX / dashes;
    var dashY = dY / dashes;
    
    var q = 0;
    while (q++ < dashes) {
        x1 += dashX;
        y1 += dashY;
        this[q % 2 == 0 ? 'moveTo' : 'lineTo'](x1, y1);
    }
    this[q % 2 == 0 ? 'moveTo' : 'lineTo'](x2, y2); 
}

var HUD = (function() {
	var _this;

	function HUD(game, player) {
		// Set player and game objects
		_this = this;
		_this.game = game;
		_this.player = player;
		_this.init();
	}

	HUD.prototype = {
		constructor : HUD,
		init : function() {
			_this.container = new createjs.Container();
			_this.container.x = _this.container.y = 0;
			_this.container.width = _this.game.width;
			_this.container.height = _this.game.height / 10;

			_this.score = new createjs.Text("Score: 0", "20px Arial", "#ffffff");
			_this.score.x = 0;
			_this.score.y = _this.game.height - (_this.score.getBounds().height * window.devicePixelRatio);
			_this.score.scaleX = this.score.scaleY = window.devicePixelRatio;
			_this.score.textAlign = "left";
			

			_this.missiles = new createjs.Text("Missiles: 0", "20px Arial", "#ffffff");
			_this.missiles.y = _this.game.height - (_this.score.getBounds().height * window.devicePixelRatio);
			_this.missiles.x = _this.game.width - (_this.missiles.getBounds().width * window.devicePixelRatio);
			_this.missiles.scaleX = _this.missiles.scaleY = window.devicePixelRatio;
			_this.missiles.textAlign = "left";
			
			// Add text to stage
			_this.container.addChild(_this.score);
			_this.container.addChild(_this.missiles);
			//_this.container.cache(-_this.container.width, -_this.container.height, _this.container.width, _this.container.height);

			_this.game.stage.addChild(_this.container);
		},
		update : function() {
			_this.score.text = "Score: " + _this.game.score;
			_this.missiles.text = "Missiles: " + _this.player.missileCount;
		}
	}

	return HUD;
})();

/**************************/
/** ------ Player ------ **/
/**************************/
var Missile = (function() {
	//var _this;

	var ACCELERATION = (0.00002 * window.devicePixelRatio); // Pixels per ms to add for each pixel distance from heading
	var MAX_SPEED = (0.45 * window.devicePixelRatio); // Pixels per ms
	var TURN_SPEED = 0.0006; // Speed of turn in MS. 1 = turn to face in 1ms 

	// Temporary before sprite is used
	var SIZE = 3;

	function Missile() {
		//_this = this;

		// Velocity components (between 0 and -1)
		this.vx = 0;
		this.vy = 0;

		// Location that missile is heading toward
		this.xHeading = null;
		this.yHeading = null;

		// Speed
		this.speed = 0;

		// FPS independent movement
		this.lastUpdate = new Date().getTime();
	}

	Missile.prototype = {
		constructor : Missile,
		init : function() {
			
		},
		setShape : function(shape) {
			this.shape = shape;
			this.shape.graphics.beginFill("#00ff00").drawCircle(0, 0, SIZE, SIZE);
			this.shape.regX = SIZE / 2;
			this.shape.regY = SIZE / 2;
			this.shape.scaleX = window.devicePixelRatio;
			this.shape.scaleY = window.devicePixelRatio;
			this.shape.cache(-SIZE, -SIZE, SIZE * 2, SIZE * 2, window.devicePixelRatio);
			this.shape.snapToPixel = true;
		},
		setHeading : function(xHeading, yHeading) {
			this.xHeading = xHeading;
			this.yHeading = yHeading;
		},
		render : function() {
			this.shape.x = this.x;
			this.shape.y = this.y;
		},
		update : function() {
			if(this.exploded) return;

			var timeSinceUpdate = new Date().getTime() - this.lastUpdate;
			this.lastUpdate = new Date().getTime();

			// Get vector which connects current location to target
			var xDiff = this.xHeading - this.x;
			var yDiff = this.yHeading - this.y;
			var hvx = (1 / (Math.abs(xDiff) + Math.abs(yDiff))) *  xDiff;
			var hvy = (1 / (Math.abs(xDiff) + Math.abs(yDiff))) *  yDiff;

			// Move heading towards target
			if(this.vx !== hvx) {
				var direction = (this.vx > hvx)? -1 : 1;
				this.vx += (timeSinceUpdate * TURN_SPEED) * direction;
			}
			if(this.vy !== hvy) {
				var direction = (this.vy > hvy)? -1 : 1;
				this.vy += (timeSinceUpdate * TURN_SPEED) * direction;
			}

			// Update speed
			this.speed += ACCELERATION * timeSinceUpdate;

			// Update location
			this.x += (timeSinceUpdate * this.speed) * this.vx;
			this.y += (timeSinceUpdate * this.speed) * this.vy;

			if(Math.abs(this.x - this.xHeading) + Math.abs(this.y - this.yHeading) < 10) {
				this.exploded = true;
			}
		}
	}

	return Missile;
})();

var Player = (function() {
	var _this;

	/*  Static vars */
	// Dimensions
	var WIDTH = 20;
	var HEIGHT = 30;

	// Speed fields
	var ACCELERATION = (0.00000150 * window.devicePixelRatio); // Pixels per ms to add for each pixel distance from heading
	var MAX_SPEED = (0.15 * window.devicePixelRatio); // Pixels per ms
	var TURN_SPEED = 0.0003; // Speed of turn in MS. 1 = turn to face in 1ms

	// Data fields
	var MAX_MISSILES = 5;
	var MISSILE_RECHARGE_TIME = 1000; // in ms
	var MISSILE_INITIAL_SPEED = 1.4; // Mltiplier for missile exit speed

	function Player(game) {
		_this = this;
		_this.game = game;
		_this.init();
	} 

	Player.prototype = {
		constructor : Player,
		init : function() {
			/**************************/
			/* START: movement fields */
			/**************************/
			// Location
			_this.x = 0;
			_this.y = 0;

			// Dimensions
			_this.width = WIDTH;
			_this.height = HEIGHT;

			// Rotation
			_this.rotation = 0.0;

			// Velocity components (between 0 and -1)
			_this.vx = 0;
			_this.vy = 0;

			// Location that ship is heading toward
			_this.xHeading = null;
			_this.yHeading = null;

			// Speed
			_this.speed = 0;

			// Last update (so updates can be FPS independent)
			_this.lastUpdate = new Date().getTime();

			// Max locations for ship
			_this.maxX = -1;
			_this.maxY = -1;
			/************************/
			/* END: movement fields */
			/************************/

			/**********************/
			/* START: data fields */
			/**********************/
			_this.missileFired = null; // So that missiles can be fired in update loop
			_this.activeMissiles = new Array();
			_this.missileCount = 5;
			_this.lastMissileFired = new Date().getTime();
			_this.lastMissileRecharged = new Date().getTime();

			/********************/
			/* END: data fields */
			/********************/
		},
		/* Setter function so caching can be setup immediately */
		setShape : function(shape) {
			_this.shape = shape;
			_this.shape.graphics.beginFill("#ff0000").drawRect(0, 0, WIDTH, HEIGHT);
			_this.shape.regX = WIDTH / 2;
			_this.shape.regY = HEIGHT / 2;
			_this.shape.scaleX = window.devicePixelRatio;
			_this.shape.scaleY = window.devicePixelRatio;
			_this.shape.cache(-WIDTH, -HEIGHT, WIDTH * 2, HEIGHT * 2);
			_this.shape.snapToPixel = true;
		},
		setMaxExtents : function(maxX, maxY) {
			_this.maxY = maxX;
			_this.maxY = maxY;

			// Increase speed for displays over 640 wide
			ACCELERATION *= maxX / (320 * window.devicePixelRatio);
			MAX_SPEED *= maxY / (320 * window.devicePixelRatio);
		},
		setHeading : function(x, y) {
			_this.xHeading = x;
			_this.yHeading = y;
		},
		fireMissile : function(x, y) {
			_this.missileFired = new createjs.Point(x, y); // Will actually be fired in next update loop
		},
		render : function() {
			_this.shape.x = _this.x;
			_this.shape.y = _this.y;
			_this.shape.rotation = _this.rotation;
		},
		update : function() {
			var timeSinceUpdate = new Date().getTime() - _this.lastUpdate;
			_this.lastUpdate = new Date().getTime();

			// If target heading is not null adjust current heading and speed
			if(_this.xHeading !== null && _this.yHeading !== null) {
				// Calculate hvx and hvy from current location
				var xDiff = _this.xHeading - _this.x;
				var yDiff = _this.yHeading - _this.y;
				var hvx = (1 / (Math.abs(xDiff) + Math.abs(yDiff))) *  xDiff;
				var hvy = (1 / (Math.abs(xDiff) + Math.abs(yDiff))) *  yDiff;

				// Move heading towards target
				if(_this.vx !== hvx) {
					var direction = (_this.vx > hvx)? -1 : 1;
					_this.vx += (timeSinceUpdate * TURN_SPEED) * direction;
				}
				if(_this.vy !== hvy) {
					var direction = (_this.vy > hvy)? -1 : 1;
					_this.vy += (timeSinceUpdate * TURN_SPEED) * direction;
				}

				// Set speed based on length of line (no need to be preceise with sqrt)
				var distanceToHeading = (xDiff + yDiff) / 2;
				_this.speed += (timeSinceUpdate * ACCELERATION) * Math.abs(distanceToHeading);
				_this.speed = (_this.speed > MAX_SPEED)? 0 + MAX_SPEED : _this.speed;
			}

			// Update location
			_this.x += (timeSinceUpdate * _this.speed) * _this.vx;
			_this.y += (timeSinceUpdate * _this.speed) * _this.vy;

			// Clamp location (origin is in center of shape)
			_this.x = ((_this.x - _this.width / 2) > _this.maxX)? (0 - _this.width / 2) : _this.x;
			_this.x = ((_this.x + _this.width / 2) < 0)? (_this.maxX + _this.width / 2) : _this.x;
			_this.y = ((_this.y - _this.height / 2) > _this.maxY)? (0 - _this.height / 2) : _this.y;
			_this.y = ((_this.y + _this.height / 2) < 0)? (_this.maxY + _this.height / 2) : _this.y;

			// Turn to face current heading
			if(_this.vy !== 0 && _this.vx !== 0) {
				_this.rotation = Math.atan2(_this.vy, _this.vx) * (180 / Math.PI) + 90;
			}

			// Recharge missiles
			if(new Date().getTime() - _this.lastMissileFired > MISSILE_RECHARGE_TIME 
				&& new Date().getTime() - _this.lastMissileRecharged > MISSILE_RECHARGE_TIME 
				&& _this.missileCount < MAX_MISSILES) {
				_this.lastMissileRecharged = new Date().getTime();
				++_this.missileCount;
			}

			// Update all missiles
			if(_this.missileCount > 0 && _this.missileFired) {
				// Adjust missile count for player
				--_this.missileCount;
				_this.lastMissileFired = new Date().getTime();

				// Setup shape and missle
				var shape = new createjs.Shape();
				var missile = new Missile();
				missile.setShape(shape);
				missile.setHeading(_this.missileFired.x, _this.missileFired.y);
				missile.vx = _this.vx;
				missile.vy = _this.vy;
				missile.x = _this.x + (_this.vx * (_this.width / 2));	// TODO: Poisiton missile at middle top of ship
				missile.y = _this.y + (_this.vy * (_this.height / 2));	// TODO: Poisiton missile at middle top of ship
				missile.speed = _this.speed * MISSILE_INITIAL_SPEED;
				_this.activeMissiles.push(missile);
				_this.game.stage.addChildAt(shape, 1); // Ensure that missile is rendered under ship
				_this.missileFired = false;
			}

			for(var i = 0; i < _this.activeMissiles.length; i++) {
				if(_this.activeMissiles[i] == null) continue;
				if(_this.activeMissiles[i].exploded) {
					_this.game.stage.removeChild(_this.activeMissiles[i].shape);
					delete _this.activeMissiles[i];
				} else {
					_this.activeMissiles[i].update();
					_this.activeMissiles[i].render();
				}
			}
		}
	}

	return Player;
})();

/*****************************/
/** ------ Main game ------ **/
/*****************************/
var SpaceRocks = (function() {
	var _this;

	// Global static vars
	var MAX_WIDTH = 768;
	var MAX_HEIGHT = 1024;
	var TARGET_FPS = 60;

	var MOVEMENT_THRESHOLD = 5; // Number of pixels user drags before being considered a touch move
	
	// Constructor
	function SpaceRocks() {
		_this = this;
		_this.init();
		_this.attachObservers();
	}

	SpaceRocks.prototype = {
		constructor : SpaceRocks,
		/***********************************/
		/** ------ Setup functions ------ **/
		/***********************************/
		init : function() {
			// FPS tracker
			_this.meter = new Stats();
			_this.meter.setMode(0);
			_this.meter.domElement.style.position = 'absolute';
			_this.meter.domElement.style.left = '0px';
			_this.meter.domElement.style.top = '0px';
			document.body.appendChild( _this.meter.domElement );

			// Set dimensions
			_this.canvas = document.getElementById("spaceRocks");
			_this.width = (window.innerWidth <= MAX_WIDTH)? window.innerWidth * window.devicePixelRatio  : MAX_WIDTH;
			_this.height = (window.innerHeight <= MAX_HEIGHT)? window.innerHeight * window.devicePixelRatio  : MAX_HEIGHT;
			_this.canvas.width = _this.width;
			_this.canvas.height = _this.height;
			_this.canvas.style.width = (_this.width / window.devicePixelRatio) + "px";
			_this.canvas.style.height = (_this.height / window.devicePixelRatio) + "px";

			// Create stage and enable touch
			_this.stage = new createjs.Stage("spaceRocks");
			createjs.Touch.enable(_this.stage);
			_this.stage.enableMouseOver(10);
			_this.stage.snapToPixelEnabled = true;

			// Setup initial entities
			_this.setupEntities();

			// Setup score
			_this.score = Math.floor(Math.random() * 100);

			// Start ticking
			createjs.Ticker.setFPS(TARGET_FPS);
			createjs.Ticker.addEventListener("tick", _this.tick);
			_this.tickCount = 0;
		},
		setupEntities : function() {
			// Create background
			//_this.background = new createjs.Shape();
			//_this.background.graphics.beginFill("#000000").drawRect(0, 0, _this.width, _this.height);
			//_this.stage.addChild(_this.background);
			//_this.background.cache(-_this.width, -_this.height, (_this.width  * 2), (_this.height * 2));

			// Create navigation
			_this.navigationContainer = new createjs.Container();
			_this.navigationContainer.visible = false;

			var navigationCircle = new createjs.Shape();
			navigationCircle.name = "navigationCircle";
			navigationCircle.graphics.setStrokeStyle(4).beginStroke("#0000ff").drawCircle(0, 0, 35 * window.devicePixelRatio, 35 * window.devicePixelRatio);
			navigationCircle.cache(-((35 * window.devicePixelRatio) + 8), -((35 * window.devicePixelRatio) + 8), (35 * window.devicePixelRatio) * 2 + 16, (35 * window.devicePixelRatio) * 2 + 16, window.devicePixelRatio);

			var navigationLine = new createjs.Shape();
			navigationLine.name = "navigationLine";
			_this.navigationContainer.addChild(navigationCircle, navigationLine);
			_this.stage.addChild(_this.navigationContainer);

			// Create player
			_this.player = new Player(_this)
			_this.player.setShape(new createjs.Shape());
			_this.player.x = (_this.width / 2) - (_this.player.width / 2);
			_this.player.y = (_this.height / 2) - (_this.player.height / 2);
			_this.player.setMaxExtents(_this.width, _this.height);
			_this.player.maxX = _this.width;
			_this.player.maxY = _this.height;
			_this.stage.addChild(_this.player.shape);
			_this.player.render();
			_this.stage.update();

			// Create HUD
			_this.hud = new HUD(_this, _this.player);
		},
		attachObservers : function() {
			// Local vars
			_this.mouseDown = null;
			_this.mouseUp = null;
			_this.mouseMove = null;

			 _this.canvas.addEventListener("touchstart", function(e) {
			 	_this.mouseDown = e;
			 	console.log(e);

			 	// Ensure that x and y coords are mapped for render function
			 	_this.mouseDown.x = e.changedTouches[0].clientX;
			 	_this.mouseDown.y = e.changedTouches[0].clientY;
			 });

			 // Manually threshold pressmove event
			_this.canvas.addEventListener("touchmove", function(e) {
			 	_this.mouseMove = e;

				// Ensure that x and y coords are mapped for render function
			 	_this.mouseMove.x = e.changedTouches[0].clientX;
			 	_this.mouseMove.y = e.changedTouches[0].clientY;
			 });

			_this.canvas.addEventListener("touchend", function(e) {	
			 	_this.mouseUp = e;
			 	if(_this.mouseUp.targetTouches.length === 0) {
			 		_this.mouseDown = null;
			 	}

			 	// Ensure that x and y coords are mapped for render function
			 	_this.mouseUp.x = e.changedTouches[0].clientX;
			 	_this.mouseUp.y = e.changedTouches[0].clientY;
			});

			_this.canvas.addEventListener("mousedown", function(e) {
			 	_this.mouseDown = e;
			});

			_this.canvas.addEventListener("mousemove", function(e) {
				_this.mouseMove = e;
			});

			_this.canvas.addEventListener("mouseup", function(e) {
			 	_this.mouseUp = e;
			 	_this.mouseDown = null;

			 	console.log(e);
			});
		},
		/****************************************/
		/** ------ Navigation functions ------ **/
		/****************************************/
		updateNavigation : function() {
			// If mouse is released and navigation is not shown
			// or use has touched with a different finger
			if(_this.mouseUp !== null && (!_this.navigationContainer.visible || 
				_this.mouseUp.targetTouches != null && _this.mouseUp.targetTouches.length > 0)) {

				_this.player.fireMissile(_this.mouseUp.x, _this.mouseUp.y);
				_this.mouseUp = null;
			}

			// If user is click dragging show navigation if movement is over thresholding
			if(_this.mouseDown !== null && _this.mouseMove !== null) {
				var distance = (Math.abs(_this.mouseDown.x - _this.mouseMove.x) + Math.abs(_this.mouseDown.y - _this.mouseMove.y)) / 2;
		 		if(distance > MOVEMENT_THRESHOLD) {
		 			_this.navigationContainer.visible = true;
					_this.lastTouchX = _this.mouseMove.x;
					_this.lastTouchY = _this.mouseMove.y;
					_this.player.setHeading(_this.mouseMove.x, _this.mouseMove.y);
		 		}
			} else {
				_this.player.setHeading(null, null);
				_this.navigationContainer.visible = false;
				_this.mouseUp = null;
				_this.mouseMove = null;
			}
		},

		renderNavigation : function() {
			// Circle where finger is
			var navigationCircle = _this.navigationContainer.getChildByName("navigationCircle");
			var navigationLine = _this.navigationContainer.getChildByName("navigationLine");
			navigationCircle.x = _this.lastTouchX;
			navigationCircle.y = this.lastTouchY;

			navigationLine.graphics.clear().setStrokeStyle(2).beginStroke("#0000ff").dashedLineTo(_this.player.x, _this.player.y, this.lastTouchX, this.lastTouchY, 4);
		},

		tick : function() {
			_this.meter.begin();
			++_this.tickCount;

			// Update and render player
			_this.player.update();
			_this.player.render();

			// Draw navigation helper if visible
			_this.updateNavigation();
			_this.renderNavigation();

			// Update HUD
			_this.hud.update();

			// Draw everything to stage
			_this.stage.update();

			_this.meter.end();
		},
	}

	return SpaceRocks;
})();

window.onload = function() {
	window.SpaceRocks = new SpaceRocks(); 
}