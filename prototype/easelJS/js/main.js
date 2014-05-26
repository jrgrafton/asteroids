/*
	TODO:
		a. Retina collisions
	

	5. Add alien
		a. Consider conditions for adding
		b. Movement?
		c. Firing at player?
	6. Additional collisions
		a. Alien bullet --> player
		b. Missile --> alien
		c. Player --> alien
	7. Add conditions
		c. Destroy all meteors
	8. Screen state management
		a. Start screen
		b. Game screen
		c. End screen
	
	9. GFX
		a. Go back to design phase
			i. iPad / iPhone scaling
			ii. End screen
		b. Start screen
			i. Buttons
			ii. Stars
			iii. Animations (TWEEN)
		c. In game
			i. Bitmaps
				i. Spaceship
			ii. Effects
				i. Missile
				ii. Spaceship accelerating
				iii. Missile hit on asteroid
			iii. Animations
				i. Missile explode
		c. End game
			i. Tween appearance
	10. Gameplay tweaks
		a. Number of asteroids (per device)
		b. Ensure no asteroids spawning on player
		c. Speed and acceration
		d. Point scoring
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

/*****************************/
/** ------ Main game ------ **/
/*****************************/
var SpaceRocks = (function() {
	var _this;

	// Global static vars
	var MAX_WIDTH = 320;
	var MAX_HEIGHT = 568;
	var TARGET_FPS = 60;

	var MOVEMENT_THRESHOLD = 5 * window.devicePixelRatio; // Number of pixels user drags before being considered a touch move
	
	var INITIAL_ASTEROID_COUNT = 1;

	// Constructor
	function SpaceRocks() {
		_this = this;
		_this.init();
		_this.attachObservers();

		// Setup entity array
		_this.entities = new Array();

		// Setup physics engine
		_this.physics = new Physics();

		// Current level
		_this.level = 1;

		// Expose public functions
		this.start = SpaceRocks.prototype.start;
		this.getDimensions = SpaceRocks.prototype.getDimensions;
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
			document.body.appendChild( _this.meter.domElement);

			// Set dimensions
			_this.canvas = document.getElementById("game");
			_this.width = (window.innerWidth <= MAX_WIDTH)? window.innerWidth * window.devicePixelRatio  : MAX_WIDTH * window.devicePixelRatio;
			_this.height = (window.innerHeight <= MAX_HEIGHT)? window.innerHeight * window.devicePixelRatio  : MAX_HEIGHT * window.devicePixelRatio;
			_this.canvas.width = _this.width;
			_this.canvas.height = _this.height;
			_this.canvas.style.width = (_this.width / window.devicePixelRatio) + "px";
			_this.canvas.style.height = (_this.height / window.devicePixelRatio) + "px";

			// Create stage and enable touch
			_this.stage = new createjs.Stage("game");
			createjs.Touch.enable(_this.stage);
			_this.stage.enableMouseOver(10);
			_this.stage.snapToPixelEnabled = true;
		},
		start : function() {
			// Setup score
			_this.score = 0;
			_this.tickCount = 0;
			_this.setupEntities();
			createjs.Ticker.setFPS(TARGET_FPS);
			createjs.Ticker.addEventListener("tick", _this.tick);
		},
		setupEntities : function() {
			// Create navigation
			_this.navigationContainer = new createjs.Container();
			_this.navigationContainer.visible = false;

			var navigationCircle = new createjs.Shape();
			navigationCircle.name = "navigationCircle";
			navigationCircle.graphics.setStrokeStyle(4).beginStroke("#15558b").drawCircle(0, 0, 35 * window.devicePixelRatio, 35 * window.devicePixelRatio);
			navigationCircle.cache(-((35 * window.devicePixelRatio) + 8), -((35 * window.devicePixelRatio) + 8), (35 * window.devicePixelRatio) * 2 + 16, (35 * window.devicePixelRatio) * 2 + 16, window.devicePixelRatio);

			var navigationLine = new createjs.Shape();
			navigationLine.name = "navigationLine";
			_this.navigationContainer.addChild(navigationCircle, navigationLine);
			_this.stage.addChildAt(_this.navigationContainer, 0);

			// Create player
			_this.player = new Player(_this);
			_this.player.setupShape();
			_this.player.x = (_this.width / 2) - (_this.player.width / 2);
			_this.player.y = (_this.height / 2) - (_this.player.height / 2);
			_this.addEntity(_this.player, 1);

			// Create HUD
			_this.hud = new HUD(_this, _this.player);

			_this.addInitialAsteroids();
		},
		attachObservers : function() {
			// Local vars
			_this.mouseDown = null;
			_this.mouseUp = null;
			_this.mouseMove = null;	

			// Prevent scrolling on page
			document.addEventListener(
			    "touchstart",
			    function() { return false; },
			    false
			);

			 _this.canvas.addEventListener("touchstart", function(e) {
			 	_this.mouseDown = e;

			 	// Ensure that x and y coords are mapped for render function
			 	_this.mouseDown.x = e.changedTouches[0].clientX * window.devicePixelRatio;
			 	_this.mouseDown.y = e.changedTouches[0].clientY * window.devicePixelRatio;
			 });

			 // Manually threshold pressmove event
			_this.canvas.addEventListener("touchmove", function(e) {
			 	_this.mouseMove = e;

				// Ensure that x and y coords are mapped for render function
			 	_this.mouseMove.x = e.changedTouches[0].clientX * window.devicePixelRatio;
			 	_this.mouseMove.y = e.changedTouches[0].clientY * window.devicePixelRatio;
			 });

			_this.canvas.addEventListener("touchend", function(e) {	
			 	_this.mouseUp = e;
			 	if(_this.mouseUp.targetTouches.length === 0) {
			 		_this.mouseDown = null;
			 	}

			 	// Ensure that x and y coords are mapped for render function
			 	_this.mouseUp.x = e.changedTouches[0].clientX * window.devicePixelRatio;
			 	_this.mouseUp.y = e.changedTouches[0].clientY * window.devicePixelRatio;
			});

			_this.canvas.addEventListener("mousedown", function(e) {
				// Retina displays do not return correct relative coordinates
			 	var overridenEvent = {
			 		x : e.x * window.devicePixelRatio,
			 		y : e.y * window.devicePixelRatio

			 	}
			 	_this.mouseDown = overridenEvent;
			});

			_this.canvas.addEventListener("mousemove", function(e) {
				// Retina displays do not return correct relative coordinates
			 	var overridenEvent = {
			 		x : e.x * window.devicePixelRatio,
			 		y : e.y * window.devicePixelRatio

			 	}
				_this.mouseMove = overridenEvent;
			});

			_this.canvas.addEventListener("mouseup", function(e) {
				// Retina displays do not return correct relative coordinates
			 	var overridenEvent = {
			 		x : e.x * window.devicePixelRatio,
			 		y : e.y * window.devicePixelRatio

			 	}
			 	_this.mouseUp = overridenEvent;
			 	_this.mouseDown = null;
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
			navigationCircle.y = _this.lastTouchY;

			navigationLine.graphics.clear().setStrokeStyle(2 * window.devicePixelRatio).beginStroke("#15558b").dashedLineTo(this.player.x, this.player.y, this.lastTouchX, this.lastTouchY, 4);
		},

		addEntity : function(entity, index) {
			// Adds object that conforms to entity interface
			_this.entities.push(entity);
			_this.stage.addChildAt(entity.shape, index);
		},
		addShape : function(shape, index) {
			_this.stage.addChildAt(shape, index);
		},
		removeShape : function(shape) {
			_this.stage.removeChild(shape);
		},
		getDimensions : function() {
			return { width: _this.width, height: _this.height};
		},
		// Needed for when alien is trying to fire at player
		getPlayerLocaton : function() {
			return { 
				x : _this.player.x, 
				y : _this.player.y 
			};
		},
		/***************************************/
		/** ------ Game tick functions ------ **/
		/***************************************/
		tick : function() {
			// Check for game over before proceeding
			if(!_this.checkGameOver()) {
				// FPS meter
				_this.meter.begin();
				++_this.tickCount;

				// Update and render navigation
				_this.updateNavigation();
				_this.renderNavigation();

				// Update HUD 
				_this.hud.update();

				// Update and render loop
				_this.tickEntities();

				// Possibly add alien
				_this.addAlien();

				// Check remaining asteroids
				_this.checkRemainingAsteroids();

				// Draw everything to stage
				_this.stage.update();
				_this.meter.end();
			} else {
				// Stop ticking and show game over dialogue
				alert("Game over");
			}
		},
		tickEntities : function() {
			// Update and render loop
			for(var i = 0; i < _this.entities.length; i++) {
				if(_this.entities[i] == null) continue;

				_this.entities[i].update();
				_this.entities[i].render();

				// Collision detection
				for(var j = i + 1; j < _this.entities.length; j++) {
					_this.physics.collide(_this.entities[i], _this.entities[j]);
				}

				// Remove entity from stage if its dead
				if(_this.entities[i].isDead()) {
					_this.stage.removeChild(_this.entities[i].shape);
					delete _this.entities[i];
				}
			}
		},
		addAlien : function() {
			// Alien has 50% chance of being added every 30 seconds
			var alienInterval = 10;
			var alienChance = 0.5;

			if(_this.tickCount % alienInterval === 0) {
				if(Math.random() > alienChance) {
					// Check to see if alien entity already exists then add
					for(var i = 0; i < _this.entities.length; i++) {
						if(_this.entities[i] == null) continue;
						if(_this.entities[i].className() === "Alien") return;
					}

					// No alien - add one
					var alien = new Alien();
				
					// Set random starting location along left side of screen
					alien.x = 0;
					alien.y = _this.height * Math.random();
					alien.setShape(new createjs.Shape());

					// Add to entity list
					_this.addEntity(alien, 2);
				}
			}	

		},
		// If no asteroids are left level up and add back asteroids
		checkRemainingAsteroids : function() {
			// Check to see if alien entity already exists then add
			for(var i = 0; i < _this.entities.length; i++) {
				if(_this.entities[i] == null) continue;
				if(_this.entities[i].className() === "Asteroid") return;
			}

			// No asteroids found - level up and add back initial asteroids
			++_this.level;
			_this.addInitialAsteroids();
		},
		addInitialAsteroids : function() {
			// Create asteroids
			for(var i = 0; i < INITIAL_ASTEROID_COUNT; i++) {
				_this.addAsteroid();
			}
		},
		addAsteroid : function() {
			var asteroid = new Asteroid();
			// Set random starting corner
			asteroid.x = Math.random() * _this.width / 3;
			if(Math.floor(Math.random() * 2) % 2 === 0) {
				asteroid.x += (_this.width / 3) * 2;
			}
			asteroid.y = Math.random() * _this.height / 3;
			if(Math.floor(Math.random() * 2) % 2 === 0) {
				asteroid.y += (_this.height / 3) * 2;
			}
			asteroid.setShape(new createjs.Shape());

			// Add to entity list
			_this.addEntity(asteroid);
		},
		// Called by other functions when score should increase
		addScore : function(points) {
			this.score += points * _this.level;
		},
		checkGameOver : function() {
			return _this.player.lifeCount === 0;
		}
	}

	return SpaceRocks;
})();

window.onload = function() {
	window.spaceRocks = new SpaceRocks(); 
	window.spaceRocks.start();
}