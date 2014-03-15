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
/** ------ Spaceship ------ **/
/*****************************/
var Spaceship = (function() {
	var _this;

	/*  Static vars */
	// Dimensions
	var WIDTH = 20;
	var HEIGHT = 30;

	// Speed
	var ACCELERATION = 0.0000045 * window.devicePixelRatio; // Pixels per ms to add for each pixel distance from heading
	var MAX_SPEED = 0.15 * window.devicePixelRatio; // Pixels per ms
	var TURN_SPEED = 0.0003; // Speed of turn in MS. 1 = turn to face in 1ms

	function Spaceship() {
		_this = this;
		_this.init();
	}

	Spaceship.prototype = {
		constructor : Spaceship,
		init : function() {
			// Location
			_this.x = 0;
			_this.y = 0;

			// Dimensions
			_this.width = WIDTH;
			_this.height = HEIGHT;

			// Rotation
			_this.rotation = 0.0;

			// Velocity in pixels per ms
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
		},
		setHeading : function(x, y) {
			_this.xHeading = x;
			_this.yHeading = y;
		},
		render : function() {
			_this.shape.x = _this.x;
			_this.shape.y = _this.y;
			_this.shape.rotation = _this.rotation;
			_this.shape.graphics.clear().beginFill("#ff0000").drawRect(0, 0, WIDTH, HEIGHT);
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
		}
	}

	return Spaceship;
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
			var canvas = document.getElementById("spaceRocks");
			_this.width = (window.innerWidth <= MAX_WIDTH)? window.innerWidth * window.devicePixelRatio  : MAX_WIDTH;
			_this.height = (window.innerHeight <= MAX_HEIGHT)? window.innerHeight * window.devicePixelRatio  : MAX_HEIGHT;
			
			canvas.width = _this.width;
			canvas.height = _this.height;
			canvas.style.width = (_this.width / window.devicePixelRatio) + "px";
			canvas.style.height = (_this.height / window.devicePixelRatio) + "px";

			// Create stage and enable touch
			_this.stage = new createjs.Stage("spaceRocks");
			createjs.Touch.enable(_this.stage);
			_this.stage.enableMouseOver(10);

			// Setup initial entities
			_this.setupEntities();

			// Start ticking
			createjs.Ticker.setFPS(TARGET_FPS);
			createjs.Ticker.addEventListener("tick", _this.tick);
		},
		setupEntities : function() {
			// Create background
			_this.background = new createjs.Shape();
			_this.background.graphics.beginFill("#00ff00").drawRect(0, 0, _this.width, _this.height);
			//_this.background.cache(-_this.width, -_this.height, (_this.width  * 2), (_this.height * 2));
			_this.stage.addChild(_this.background);

			// Create navigation
			_this.navigationContainer = new createjs.Container();
			_this.navigationContainer.visible = false;

			var navigationCircle = new createjs.Shape();
			navigationCircle.name = "navigationCircle";
			navigationCircle.graphics.setStrokeStyle(2).beginStroke("#0000ff").drawCircle(0, 0, 35 * window.devicePixelRatio, 35 * window.devicePixelRatio);
			navigationCircle.cache(-((35 * window.devicePixelRatio) + 4), -((35 * window.devicePixelRatio) + 4), (35 * window.devicePixelRatio) * 2 + 8, (35 * window.devicePixelRatio) * 2 + 8);

			var navigationLine = new createjs.Shape();
			navigationLine.name = "navigationLine";
			_this.navigationContainer.addChild(navigationCircle, navigationLine);
			_this.stage.addChild(_this.navigationContainer);

			// Create ship
			_this.ship = new Spaceship()
			_this.ship.setShape(new createjs.Shape());
			_this.ship.x = (_this.width / 2) - (_this.ship.width / 2);
			_this.ship.y = (_this.height / 2) - (_this.ship.height / 2);
			_this.ship.maxX = _this.width;
			_this.ship.maxY = _this.height;
			_this.stage.addChild(_this.ship.shape);
			_this.ship.render();
			_this.stage.update();
		},
		attachObservers : function() {
			alert("attached 4");
			 _this.ship.shape.on("click", function() {
			 	alert("click");
			 });

			 _this.ship.shape.on("pressmove", function() {
			 	alert("touch");
			 });

			 _this.background.on("pressmove", function(e) {
			 	//alert("touch");
			 	_this.navigationContainer.visible = true;
				_this.lastTouchX = e.stageX;
				_this.lastTouchY = e.stageY;
				_this.ship.setHeading(e.stageX, e.stageY);
			 });

			 _this.background.on("pressup", function() {
			 	//alert("pressup")
				_this.ship.setHeading(null, null);
				setTimeout(function() { _this.navigationContainer.visible = false; }, 500);
			 });
		},
		/**********************************/
		/** ------ Draw functions ------ **/
		/**********************************/
		redrawNavigationHelper : function(x, y) {
			// Circle where finger is
			var navigationCircle = _this.navigationContainer.getChildByName("navigationCircle");
			var navigationLine = _this.navigationContainer.getChildByName("navigationLine");
			navigationCircle.x = x;
			navigationCircle.y = y;

			navigationLine.graphics.clear().setStrokeStyle(2).beginStroke("#0000ff").dashedLineTo(_this.ship.x, _this.ship.y, x, y, 4);
		},

		tick : function() {
			_this.meter.begin();

			// Update and render ship
			_this.ship.update();
			_this.ship.render();

			// Draw navigation helper if visible
			if(_this.navigationContainer.visible) {
				_this.redrawNavigationHelper(_this.lastTouchX, _this.lastTouchY);
			}

			_this.stage.update();
			_this.meter.end();
		},
	}

	return SpaceRocks;
})();

window.onload = function() {
	window.SpaceRocks = new SpaceRocks(); 
}