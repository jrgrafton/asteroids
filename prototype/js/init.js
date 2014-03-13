/*******************/
/** ------ EaselJS additions------ **/
/*******************/
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

/*******************/
/** ------ Main game ------ **/
/*******************/
var SpaceRocks = (function() {
	var _this;

	// Global state vars
	var navigationShown = false;
	
	// Constructor
	function SpaceRocks() {
		_this = this;
		_this.init();
		_this.attachObservers();
	}

	SpaceRocks.prototype = {
		constructor : SpaceRocks,
		init : function() {
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
			_this.background.graphics.beginFill("#000000").drawRect(0, 0, 320, 568);
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
			_this.ship = new createjs.Shape();
			_this.ship.x = 155;
			_this.ship.y = 269;
			_this.ship.graphics.beginFill("#ff0000").drawRect(0, 0, 20, 30);
			_this.stage.addChild(_this.ship);
			_this.stage.update();
		},
		attachObservers : function() {
			_this.background.on("pressmove", function(e) { 
				_this.redrawNavigationHelper(e);
			});

			_this.background.on("pressup", function(e) {
				_this.navigationContainer.visible = false;
				setTimeout(function() { _this.stage.update(); }, 500);
			});
		},
		redrawNavigationHelper : function(e) {
			// Circle where finger is
			_this.navigationContainer.visible = true;
			var navigationCircle = _this.navigationContainer.getChildByName("navigationCircle");
			var navigationLine = _this.navigationContainer.getChildByName("navigationLine");
			navigationCircle.x = e.stageX;
			navigationCircle.y = e.stageY;

			navigationLine.graphics.clear().setStrokeStyle(2).beginStroke("#0000ff").dashedLineTo(_this.ship.x, _this.ship.y, e.stageX, e.stageY, 4);

			_this.stage.update();
		},

		tick : function() {
			if(new Date().getTime() % 120 === 0) {
				console.log("Current FPS: " + createjs.Ticker.getFPS());
			}
		},
	}

	return SpaceRocks;
})();

window.onload = function() {
	window.SpaceRocks = new SpaceRocks(); 
}