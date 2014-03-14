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

	// Static vars
	var WIDTH = 20;
	var HEIGHT = 30;

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
			_this.angle = 0.0;

			// Velocity in pixels per ms
			_this.vx = 0;
			_this.vy = 0;
		},
		/* Setter function so caching can be setup immediately */
		setShape : function(shape) {
			_this.shape = shape;
			_this.shape.graphics.beginFill("#ff0000").drawRect(0, 0, WIDTH, HEIGHT);
			_this.shape.regX = WIDTH / 2;
			_this.shape.regY = HEIGHT / 2;
			_this.shape.cache(-WIDTH, -HEIGHT, WIDTH * 2, HEIGHT * 2);
		},
		render : function() {
			_this.shape.x = _this.x;
			_this.shape.y = _this.y;
			_this.shape.graphics.clear().beginFill("#ff0000").drawRect(0, 0, WIDTH, HEIGHT);
		},
		turnToFace : function(x, y) {
			var deltaX = _this.x - x;
			var deltaY = _this.y - y;

			// Get angle from x axis to target from 0 to 360
			var targetAngle = (Math.atan2(deltaY ,deltaX) * 180 / Math.PI) - 90;
			targetAngle = (targetAngle > -180)? targetAngle : 90 + (270 - Math.abs(targetAngle));
			targetAngle = (targetAngle > 0)? targetAngle : 360 + targetAngle;
			var diff = targetAngle - _this.angle;

			_this.angle += diff;
			_this.shape.rotation = _this.angle;
			
		}
	}

	return Spaceship;
})();

/*****************************/
/** ------ Main game ------ **/
/*****************************/
var SpaceRocks = (function() {
	var _this;

	// Global state vars
	var MAX_WIDTH = 320;
	var MAX_HEIGHT = 568;
	
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
			_this.width = (window.innerWidth < MAX_WIDTH)? window.innerWidth : MAX_WIDTH;
			_this.height = (window.innerHeight < MAX_HEIGHT)? window.innerHeight : MAX_HEIGHT;
			canvas.setAttribute("width", _this.width);
			canvas.setAttribute("height", _this.height);
			
			// Create stage and enable touch
			_this.stage = new createjs.Stage("spaceRocks");
			createjs.Touch.enable(_this.stage);

			// Setup initial entities
			_this.setupEntities();

			// Start ticking
			createjs.Ticker.setFPS(60);
			createjs.Ticker.addEventListener("tick", _this.tick);
		},
		setupEntities : function() {
			// Create background
			_this.background = new createjs.Shape();
			_this.background.graphics.beginFill("#000000").drawRect(0, 0, _this.width, _this.height);
			_this.background.cache(-_this.width, -_this.height, _this.width * 2, _this.height * 2);
			_this.stage.addChild(_this.background);

			// Create navigation
			_this.navigationContainer = new createjs.Container();
			_this.navigationContainer.visible = false;

			var navigationCircle = new createjs.Shape();
			navigationCircle.name = "navigationCircle";
			navigationCircle.graphics.setStrokeStyle(2).beginStroke("#0000ff").drawCircle(0, 0, 35, 35);
			navigationCircle.cache(-39, -39, 78, 78);
			var navigationLine = new createjs.Shape();
			navigationLine.name = "navigationLine";
			_this.navigationContainer.addChild(navigationCircle, navigationLine);
			_this.stage.addChild(_this.navigationContainer);

			// Create ship
			_this.ship = new Spaceship()
			_this.ship.setShape(new createjs.Shape());
			_this.ship.x = (_this.width / 2) - (_this.ship.width / 2);
			_this.ship.y = (_this.height / 2) - (_this.ship.height / 2);
			_this.stage.addChild(_this.ship.shape);
			_this.ship.render();
			_this.stage.update();
		},
		attachObservers : function() {
			_this.background.on("pressmove", function(e) { 
				_this.redrawNavigationHelper(e);
				_this.ship.turnToFace(e.stageX, e.stageY);
			});

			_this.background.on("pressup", function(e) {
				_this.navigationContainer.visible = false;
				setTimeout(function() { _this.stage.update(); }, 500);
			});
		},
		/**********************************/
		/** ------ Draw functions ------ **/
		/**********************************/
		redrawNavigationHelper : function(e) {
			// Circle where finger is
			_this.navigationContainer.visible = true;
			var navigationCircle = _this.navigationContainer.getChildByName("navigationCircle");
			var navigationLine = _this.navigationContainer.getChildByName("navigationLine");
			navigationCircle.x = e.stageX;
			navigationCircle.y = e.stageY;

			navigationLine.graphics.clear().setStrokeStyle(2).beginStroke("#0000ff").dashedLineTo(_this.ship.x, _this.ship.y, e.stageX, e.stageY, 4);
		},

		tick : function() {
			_this.meter.begin();
			_this.ship.render();
			_this.stage.update();
			_this.meter.end();
		},
	}

	return SpaceRocks;
})();

window.onload = function() {
	window.SpaceRocks = new SpaceRocks(); 
}