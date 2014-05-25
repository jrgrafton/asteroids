/**********************/
/** ------ UI ------ **/
/**********************/
var HUD = (function() {
	function HUD() {
		// Set player and game objects
		this.init();
	}

	HUD.prototype = {
		constructor : HUD,
		init : function() {
			this.container = new createjs.Container();
			this.container.x = this.container.y = 0;
			this.container.width = window.spaceRocks.getDimensions().width;
			this.container.height = window.spaceRocks.getDimensions().height / 10;

			this.score = new createjs.Text("Score: 0", "20px Arial", "#ffffff");
			this.score.x = 0;
			this.score.y = window.spaceRocks.getDimensions().height - (this.score.getBounds().height * window.devicePixelRatio);
			this.score.scaleX = this.score.scaleY = window.devicePixelRatio;
			this.score.textAlign = "left";

			this.missiles = new createjs.Text("Missiles: 0", "20px Arial", "#ffffff");
			this.missiles.y = window.spaceRocks.getDimensions().height - (this.score.getBounds().height * window.devicePixelRatio);
			this.missiles.x = window.spaceRocks.getDimensions().width - (this.missiles.getBounds().width * window.devicePixelRatio);
			this.missiles.scaleX = this.missiles.scaleY = window.devicePixelRatio;
			this.missiles.textAlign = "left";

			this.lives = new createjs.Text("Lives: 3", "20px Arial", "#ffffff");
			this.lives.y = window.spaceRocks.getDimensions().height - (this.score.getBounds().height * window.devicePixelRatio);
			this.lives.x = window.spaceRocks.getDimensions().width - (window.spaceRocks.getDimensions().width / 2) - ((this.lives.getBounds().width * window.devicePixelRatio) / 2);
			this.lives.scaleX = this.lives.scaleY = window.devicePixelRatio;
			this.lives.textAlign = "left";
			
			// Add text to stage
			this.container.addChild(this.score);
			this.container.addChild(this.missiles);
			this.container.addChild(this.lives);
			window.spaceRocks.stage.addChild(this.container);
		},
		update : function() {
			this.score.text = "Score: " + window.spaceRocks.score + "(*" + window.spaceRocks.level + ")";
			this.missiles.text = "Missiles: " + window.spaceRocks.player.missileCount;
			this.lives.text = "Lives: " + window.spaceRocks.player.lifeCount;
		}
	}

	return HUD;
})();