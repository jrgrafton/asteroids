/*
	TODO:

	2. Explosions
		a. Exlode time
		b. Explode radius
	4. Collisions
		a. Refactor to genericise detection
			i. Collidable interface
			ii. Visitor pattern?
			iii. Destructable
			iv. Points?
		b. Meteor --> player
		c. Missile --> Meteor
			a. Setup explosiion radius at detination point

	5. Add alien
		a. Consider conditions for adding
		b. Movement?
		c. Firing at player?
	6. Additional collisions
		a. Alien bullet --> player
		b. Missile --> alien
		c. Player --> alient
	7. Add conditions
		a. Loose a life
			i. Invulnerable
		b. Loose all lifes
			iii. Show end screen
		c. Destroy all meteors
	8. Screen state management
		a. Start screen
		b. Game screen
		c. End screen
	9. GFX
		a. Start screen
			i. Buttons
			ii. Stars
			iii. Animations (TWEEN)
		b. In game
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
			this.score.text = "Score: " + window.spaceRocks.score;
			this.missiles.text = "Missiles: " + window.spaceRocks.player.missileCount;
			this.lives.text = "Lives: " + window.spaceRocks.player.lifeCount;
		}
	}

	return HUD;
})();

/***************************/
/** ------ Physics ------ **/
/***************************/
var Physics = (function() {

	function Physics() {}

	Physics.prototype = {
		constructor : Physics,
		// x, y radius and centre
		testPointCircle : function(x, y, radius, centre) {},
		// x, y, points (polygon), rotation
		testPointPolygon : function(x, y, points, rotation) {},
		// Centre one, radius one, centre two, radius 2
		testCircleCircle : function(c1, r1, c2, r2){},
		// Origin, centre, radius
		testRectangleCircle : function(origin, rotation, radius, centre) {},
		// Origin one, rotation one, origin two, points (polygon), rotation two
		testRectanglePolygon : function(o1, r1, o2, points, r2) {},

		// Get polygon from points
		getPolygonFromPoints : function(points, rotation, x, y) {
			var targetPoints = new Array();
			for(var i = 0; i < points.length; i++) {
				targetPoints.push(new SAT.Vector(Math.round(points[i].x), Math.round(points[i].y)));
			}

			// Points usually drawn from 0 rad to Math.PI * 4 rad. Reverse array for physics calculations
			var polygon = new SAT.Polygon(new SAT.Vector(x, y), targetPoints.reverse());
			polygon.angle = rotation;
			polygon.recalc();

			return polygon;
		},

		// Two entity collision
		hasCollided : function(e1, e2){
			var entities = new Array();
			entities.push(e1, e2);
			entities.sort(function(){ return e1.getHitBoxType() > e2.getHitBoxType() });

			var e1d = entities[0].getDimensions();
			var e2d = entities[1].getDimensions();

			switch(entities[0].getHitBoxType()) {
				case 0:
					var sat1 = new SAT.Vector(e1d.x, e1d.y);
					switch(entities[1].getHitBoxType()) {
						case 1:
							// Point in circle
							var sat2 = new SAT.Circle(new SAT.Vector(e2d.x, e2d.y), e2d.width);
							return SAT.pointInCircle(sat1, sat2).collided;
						break;
						case 2:
							// Point in rectangle
							var sat2 = new SAT.Box(new SAT.Vector(e2d.x, e2d.y), e2d.width, e2d.height).toPolygon();
							sat2.angle = e2d.rotation;
							sat2.recalc();
							return SAT.pointInPolygon(sat1, sat2).collided;
						break;
						case 3:
							// Point in poly
							var sat2 = this.getPolygonFromPoints(e2d.points, e2d.rotation);
							return SAT.pointInPolygon(sat1, sat2).collided;
						break;
						default:
							return false;
						break;
					}
				break;
				case 1:
					var sat1 = new SAT.Circle(new SAT.Vector(e1d.x, e1d.y), e1d.width);
					switch(entities[1].getHitBoxType()) {
						case 1:
							// Circle in circle
							var sat2 = new SAT.Circle(new SAT.Vector(e2d.x, e2d.y), e2d.width);
							return SAT.testCircleCircle(sat1, sat2, new SAT.Response());
						break;
						case 2:
							// Circle in rectangle
							var sat2 = new SAT.Box(new SAT.Vector(e2d.x, e2d.y), e2d.width, e2d.height).toPolygon();
							sat2.angle = e2d.rotation;
							sat2.recalc();
							return SAT.testCirclePolygon(sat1, sat2, new SAT.Response());
						break;
						case 3:
							// Circle in polygon
							var sat2 = this.getPolygonFromPoints(e2d.points, e2d.rotation, e2d.x, e2d.y);
							return SAT.testCirclePolygon(sat1, sat2, new SAT.Response());
						break;
						default:
							return false;
						break;
					}
				break;
				case 2:
					var sat1 = new SAT.Box(new SAT.Vector(e1d.x, e1d.y), e1d.width, e1d.height).toPolygon();
					switch(entities[1].getHitBoxType()) {
						case 2:
							// Rectangle in rectangle
							var sat2 = new SAT.Box(new SAT.Vector(e2d.x, e2d.y), e2d.width, e2d.height).toPolygon();
							return SAT.testPolygonPolygon(sat1, sat2, new SAT.Response());
						break;
						case 3:
							// Rectangle in polygon
							var response = new SAT.Response();
							var sat2 = this.getPolygonFromPoints(e2d.points, e2d.rotation, e2d.x, e2d.y);
							var result =  SAT.testPolygonPolygon(sat1, sat2, response);
							//console.log(e2d);
							console.log(response);
							console.log(result);
							return result;
						break;
						default:
							return false;
						break;
					}
				break;
				case 3:
					var sat1 = this.getPolygonFromPoints(e2d.points, e2d.rotation);
					switch(entities[1].getHitBoxType()) {
						case 3:
							// Polygon in polygon
							var sat2 = this.getPolygonFromPoints(e2d.points, e2d.rotation, e2d.x, e2d.y);
							return SAT.testPolygonPolygon(sat1, sat2, new SAT.Response());
						break;
						default:
							return false;
						break;
					}
				break;
				default:
				return false;
			}
		}
	}

	return Physics;
})();

/************************************/
/** ------ Entity Interface ------ **/
/************************************/
var Entity = (function() {

	function Entity() {
		
	};

	// Used to normalise all entity collisions and updates in game
	return {
		constructor : Entity,
		/* GFX and state */
		update : function(){},
		render : function(){},
		setShape : function(){},
		isDead : function(){ return false; },
		/* Physics */
		hitBoxTypes : {
			POINT : 0,
			CIRCLE : 1,
			RECTANGLE : 2,
			POLYGON : 3
		},
		getDimensions : function() { 
			return { 
				x : this.shape.getBounds().x,
				y : this.shape.getBounds().y,
				width : this.shape.getBounds().width,
				height : this.shape.getBounds().height,
				points : this.points || null,
				rotation : this.rotation || 0
			} 
		},
		getHitBox : function(){},
		getHitBoxType : function(){},
		canCollideWidth : function(entity){},
		collidedWith : function(entity){},
		className : function() { 
		   var funcNameRegex = /function (.{1,})\(/;
		   var results = (funcNameRegex).exec((this).constructor.toString());
		   return (results && results.length > 1) ? results[1] : "";
		}
		
	}
})();

/**************************************/
/** ------ Entity definitions ------ **/
/**************************************/
var Asteroid = (function(Entity) {

	// Static fields
	var SPEED = (0.0125 * window.devicePixelRatio); // Pixels per ms (asteroids have constant speed)
	var SIZES = { // Mapping of "size type" to radius of asteroids
		0 : 10,
		1 : 20,
		2 : 40,
		3 : 80
	};
	var ROTATION_SPEED = 0.0090; // in degrees per ms

	function Asteroid() {
		// Mixin entity base class
		for(var method in Entity) {
			if(this[method] == undefined) {
				this[method] = Entity[method];
			}
		}
		this.init();
	}

	Asteroid.prototype = {
		constructor : Asteroid,
		init : function() {
			// Velocity components (between 1 and -1)
			this.vx = ((Math.random()) * 2) - 1;
			this.vy = ((Math.random()) * 2) - 1;

			// Normalise
			this.vx = 1 / (Math.abs(this.vx) + Math.abs(this.vy)) * this.vx;
			this.vy = 1 / (Math.abs(this.vx) + Math.abs(this.vy)) * this.vy;

			// Speed
			this.speed = 0;//SPEED * (Math.random() + 0.5);

			// FPS independent movement
			this.lastUpdate = new Date().getTime();

			// Current size index
			this.sizeIndex = 3
			this.radius = SIZES[this.sizeIndex];

			// Max extents
			this.maxX = window.spaceRocks.getDimensions().width;
			this.maxY = window.spaceRocks.getDimensions().height;

			// Rotation speed and angle (in degress per ms)
			this.rotation = 0;
			this.rotationSpeed = 0;//ROTATION_SPEED * (Math.random() + 0.5);
			if(Math.floor(Math.random() * 100) % 2 === 0) {
				this.rotationSpeed = 0 - this.rotationSpeed;
			}
		},
		getRandomInRange : function(min, max) {
			return Math.random() * (max - min) + min;
		},
		drawOutline : function(shape) {
			var asteroidRadius = this.radius;

			// Furthest indentation can be from outer edge of circle
			var minRadius = asteroidRadius * 0.6;
			var maxRadius = asteroidRadius * 1;

			// Shortest and longest lengths for lines between edges of asteroid
			var minLineDistance = (2 * Math.PI) / 20;
			var maxLineDistance = (2 * Math.PI) / 15;

			// First point is at 0 rad
			this.points = new Array();
			var distanceFromCenter = this.getRandomInRange(minRadius, maxRadius);
			var firstPoint = new createjs.Point(distanceFromCenter, 0);
			var currentPoint = firstPoint;
			var angle = 0.0;
			var vx = 1;
			var vy = 0;
			shape.graphics.setStrokeStyle(4).beginStroke("#ffffff");
			shape.graphics.moveTo(firstPoint.x, firstPoint.y);
			this.points.push(firstPoint);
			while(angle < ((2 * Math.PI) - maxLineDistance)) {
				var lineLength = this.getRandomInRange(minLineDistance, maxLineDistance);
				angle += this.getRandomInRange(minLineDistance, maxLineDistance);
				distanceFromCenter = this.getRandomInRange(minRadius, maxRadius);
				vx = Math.cos(angle);
				vy = Math.sin(angle);
				nextPoint = new createjs.Point(vx * distanceFromCenter, vy * distanceFromCenter);
				this.points.push(nextPoint);
				shape.graphics.arcTo(currentPoint.x, currentPoint.y,  nextPoint.x,  nextPoint.y,  asteroidRadius / 6);
				currentPoint = nextPoint;
			}

			// Draw final line (@TODO look into curveTo)
			shape.graphics.arcTo(firstPoint.x, currentPoint.y, firstPoint.x, firstPoint.y, 5);
			shape.graphics.lineTo(firstPoint.x, firstPoint.y);
			shape.graphics.endStroke();
		},
		setShape : function(shape) {
			this.shape = shape;
			this.shape.scaleX = window.devicePixelRatio;
			this.shape.scaleY = window.devicePixelRatio;
			//this.shape.regX = (this.size * window.devicePixelRatio);
			//this.shape.regY = (this.size * window.devicePixelRatio);
			this.drawOutline(this.shape);
			this.shape.cache(-(this.radius + 4), 
							-(this.radius + 4), 
							(this.radius * 2) + 8, 
							(this.radius * 2) + 8, 
							window.devicePixelRatio);
			this.shape.snapToPixel = true;
			this.shape.setBounds(this.x, this.y, this.radius * 2, this.radius * 2);
		},
		canCollideWidth : function(entity) {
			var collidesWith = new Array("Missile", "MissileExplosion", "Player");
			return collidesWith.indexOf(entity.className()) !== -1;
		},
		getHitBoxType : function() {
			return this.hitBoxTypes.POLYGON
		},
		render : function() {
			// @TODO render parts on opposite sceen when rendering goes offscreen
			this.shape.x = this.x;
			this.shape.y = this.y;
			this.shape.rotation = this.rotation;
			this.shape.setBounds(this.x, this.y, this.radius * 2, this.radius * 2);
		},
		update : function() {
			var timeSinceUpdate = new Date().getTime() - this.lastUpdate;
			this.lastUpdate = new Date().getTime();

			this.x += (timeSinceUpdate * this.speed) * this.vx;
			this.y += (timeSinceUpdate * this.speed) * this.vy;

			// Clamp location (origin is in top left of shape)
			this.x = (this.x - (this.radius * window.devicePixelRatio) > this.maxX)? (0 - this.radius * window.devicePixelRatio) : this.x;
			this.x = (this.x + (this.radius * window.devicePixelRatio) < 0)? (this.maxX + this.radius * window.devicePixelRatio) : this.x;
			this.y = (this.y - (this.radius * window.devicePixelRatio) > this.maxY)? (0 - this.radius * window.devicePixelRatio) : this.y;
			this.y = (this.y + (this.radius * window.devicePixelRatio) < 0)? (this.maxY + this.radius * window.devicePixelRatio) : this.y;

			// Rotate asteroid
			this.rotation += (timeSinceUpdate * this.rotationSpeed);
		}
	}

	return Asteroid;
})(Entity);

var MissileExplosion =  (function(Entity) {
	var EXPLOSION_TIME = 1500; // Explosion length in ms
	var EXPLOSION_RADIUS = 30; // Explosion radius in pixels

	function MissileExplosion() {
		// Mixin entity base class
		for(var method in Entity) {
			if(this[method] == undefined) {
				this[method] = Entity[method];
			}
		}

		// Explosion start time
		this.explositionStart = new Date().getTime();
		this.radius = 1;

		// So that animation can be time related
		this.lastUpdate = new Date().getTime();
	}

	MissileExplosion.prototype = {
		constructor : MissileExplosion,
		setShape : function(shape) {
			this.shape = shape;
			this.shape.scaleX = window.devicePixelRatio;
			this.shape.scaleY = window.devicePixelRatio;
			this.shape.regX = (this.radius * window.devicePixelRatio);
			this.shape.regY = (this.radius * window.devicePixelRatio);
			this.shape.graphics.beginFill("#ccc").drawCircle(0, 0, this.radius, this.radius);
			this.shape.snapToPixel = true;
		},
		getHitBoxType : function() {
			return this.hitBoxTypes.CIRCLE
		},
		canCollideWidth : function(entity) {
			var collidesWith = new Array("Asteroid");
			return collidesWith.indexOf(entity.className()) !== -1;
		},
		render : function() {
			this.shape.x = this.x;
			this.shape.y = this.y;
			this.shape.graphics.clear().beginFill("#eee").drawCircle(0, 0, this.radius, this.radius);
			this.shape.setBounds(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
		},
		update : function() {
			// Expand or contract size based on time since explosion
			this.timeSinceExplosion = new Date().getTime() - this.explositionStart;
			this.timeSinceLastUpdate = new Date().getTime() - this.lastUpdate;
			this.lastUpdate = new Date().getTime();

			// If it's passed halfway start contracting
			var pixelsPerMS = EXPLOSION_RADIUS / EXPLOSION_TIME;
			if(this.timeSinceExplosion > EXPLOSION_TIME / 2) {
				this.radius -= pixelsPerMS * this.timeSinceLastUpdate;
			} else {
				this.radius += pixelsPerMS * this.timeSinceLastUpdate;
			}
		},
		isDead : function() {
			return this.radius < 0;
		}
	}

	return MissileExplosion;
})(Entity);

var Missile = (function(Entity) {
	//var this;

	var ACCELERATION = (0.00002 * window.devicePixelRatio); // Pixels per ms to add for each pixel distance from heading
	var MAX_SPEED = (0.45 * window.devicePixelRatio); // Pixels per ms
	var MIN_SPEED = (0.2 * window.devicePixelRatio); // Pixels per ms
	var TURN_SPEED = 0.0006; // Speed of turn in MS. 1 = turn to face in 1ms 

	// Temporary before sprite is used
	var SIZE = 3;

	function Missile() {
		// Mixin entity base class
		for(var method in Entity) {
			if(this[method] == undefined) {
				this[method] = Entity[method];
			}
		}

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
			this.shape.setBounds(this.x, this.y, 1, 1);
		},
		setHeading : function(xHeading, yHeading) {
			this.xHeading = xHeading;
			this.yHeading = yHeading;
		},
		getHitBoxType : function() {
			return this.hitBoxTypes.POINT
		},
		canCollideWidth : function(entity) {
			var collidesWith = new Array("Asteroid");
			return collidesWith.indexOf(entity.className()) !== -1;
		},
		collidedWith : function(entity) {
			if(entity.className() === "Asteroid") {
				console.log("Missile collided with asteroid");
			}
		},
		render : function() {
			this.shape.x = this.x;
			this.shape.y = this.y;
			this.shape.setBounds(this.x, this.y, 1, 1);
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
			this.speed = (this.speed < MIN_SPEED)? MIN_SPEED : this.speed;
			this.speed = (this.speed > MAX_SPEED)? MAX_SPEED : this.speed;

			// Update location
			this.x += (timeSinceUpdate * this.speed) * this.vx;
			this.y += (timeSinceUpdate * this.speed) * this.vy;

			// If dead add an explosion
			if(this.isDead()) {
				this.explode();
			}
		},
		explode : function() {
			// Setup shape and missle
			var shape = new createjs.Shape();
			var missileExplosion = new MissileExplosion();
			missileExplosion.setShape(shape);
			missileExplosion.x = this.x;
			missileExplosion.y = this.y;
			window.spaceRocks.addEntity(missileExplosion, 1);

			this.exploded = true;
		},
		isDead : function() {
			return this.exploded || (Math.abs(this.x - this.xHeading) + Math.abs(this.y - this.yHeading) < 10);
		}
	}

	return Missile;
})(Entity);

var Player = (function(Entity) {
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

	function Player() {
		// Mixin entity base class
		for(var method in Entity) {
			if(this[method] == undefined) {
				this[method] = Entity[method];
			}
		}
		// Scale based on canvas size
		ACCELERATION *= window.spaceRocks.getDimensions().width / (320 * window.devicePixelRatio);
		MAX_SPEED *= window.spaceRocks.getDimensions().width / (320 * window.devicePixelRatio);

		this.init();
	} 

	Player.prototype = {
		constructor : Player,
		init : function() {
			/**************************/
			/* START: movement fields */
			/**************************/
			// Location
			this.x = 0;
			this.y = 0;

			// Dimensions
			this.width = WIDTH;
			this.height = HEIGHT;

			// Rotation
			this.rotation = 0.0;

			// Velocity components (between 0 and -1)
			this.vx = 0;
			this.vy = 0;

			// Location that ship is heading toward
			this.xHeading = null;
			this.yHeading = null;

			// Speed
			this.speed = 0;

			// Last update (so updates can be FPS independent)
			this.lastUpdate = new Date().getTime();

			// Max locations for ship
			this.maxX =  window.spaceRocks.getDimensions().width;
			this.maxY = window.spaceRocks.getDimensions().height;
			/************************/
			/* END: movement fields */
			/************************/

			/**********************/
			/* START: data fields */
			/**********************/
			this.missileFired = null; // So that missiles can be fired in update loop
			this.activeMissiles = new Array();
			this.missileCount = 5;
			this.lastMissileFired = new Date().getTime();
			this.lastMissileRecharged = new Date().getTime();
			this.lifeCount = 3;

			/********************/
			/* END: data fields */
			/********************/
		},
		/* Setter function so caching can be setup immediately */
		setShape : function(shape) {
			this.shape = shape;
			this.shape.graphics.beginFill("#ff0000").drawRect(0, 0, WIDTH, HEIGHT);
			this.shape.regX = WIDTH / 2;
			this.shape.regY = HEIGHT / 2;
			this.shape.scaleX = window.devicePixelRatio;
			this.shape.scaleY = window.devicePixelRatio;
			this.shape.cache(-WIDTH, -HEIGHT, WIDTH * 2, HEIGHT * 2);
			this.shape.snapToPixel = true;
		},
		setHeading : function(x, y) {
			this.xHeading = x;
			this.yHeading = y;
		},
		fireMissile : function(x, y) {
			this.missileFired = new createjs.Point(x, y); // Will actually be fired in next update loop
		},
		getHitBoxType : function() {
			return this.hitBoxTypes.RECTANGLE
		},
		canCollideWidth : function(entity) {
			var collidesWith = new Array("Asteroid");
			return collidesWith.indexOf(entity.className()) !== -1;
		},
		render : function() {
			this.shape.x = this.x;
			this.shape.y = this.y;
			this.shape.rotation = this.rotation;
			this.shape.setBounds(this.x, this.y, WIDTH, HEIGHT);
		},
		update : function() {
			var timeSinceUpdate = new Date().getTime() - this.lastUpdate;
			this.lastUpdate = new Date().getTime();

			// If target heading is not null adjust current heading and speed
			if(this.xHeading !== null && this.yHeading !== null) {
				// Calculate hvx and hvy from current location
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

				// Set speed based on length of line (no need to be preceise with sqrt)
				var distanceToHeading = (xDiff + yDiff) / 2;
				this.speed += (timeSinceUpdate * ACCELERATION) * Math.abs(distanceToHeading);
				this.speed = (this.speed > MAX_SPEED)? 0 + MAX_SPEED : this.speed;
			}

			// Update location
			this.x += (timeSinceUpdate * this.speed) * this.vx;
			this.y += (timeSinceUpdate * this.speed) * this.vy;

			// Clamp location (origin is in center of shape)
			this.x = ((this.x - this.width / 2) > this.maxX)? (0 - this.width / 2) : this.x;
			this.x = ((this.x + this.width / 2) < 0)? (this.maxX + this.width / 2) : this.x;
			this.y = ((this.y - this.height / 2) > this.maxY)? (0 - this.height / 2) : this.y;
			this.y = ((this.y + this.height / 2) < 0)? (this.maxY + this.height / 2) : this.y;

			// Turn to face current heading
			if(this.vy !== 0 && this.vx !== 0) {
				this.rotation = Math.atan2(this.vy, this.vx) * (180 / Math.PI) + 90;
			}

			// Recharge missiles
			if(new Date().getTime() - this.lastMissileFired > MISSILE_RECHARGE_TIME 
				&& new Date().getTime() - this.lastMissileRecharged > MISSILE_RECHARGE_TIME 
				&& this.missileCount < MAX_MISSILES) {
				this.lastMissileRecharged = new Date().getTime();
				++this.missileCount;
			}

			// Create missiles
			if(this.missileCount > 0 && this.missileFired) {
				// Adjust missile count for player
				--this.missileCount;
				this.lastMissileFired = new Date().getTime();

				// Setup shape and missle
				var shape = new createjs.Shape();
				var missile = new Missile();
				missile.setShape(shape);
				missile.setHeading(this.missileFired.x, this.missileFired.y);
				missile.vx = this.vx;
				missile.vy = this.vy;
				missile.x = this.x + (this.vx * (this.width / 2));	// TODO: Poisiton missile at middle top of ship
				missile.y = this.y + (this.vy * (this.height / 2));	// TODO: Poisiton missile at middle top of ship
				missile.speed = this.speed * MISSILE_INITIAL_SPEED;
				
				window.spaceRocks.addEntity(missile, 1);
				this.missileFired = false;
			}
		}
	}

	return Player;
})(Entity);

/*****************************/
/** ------ Main game ------ **/
/*****************************/
var SpaceRocks = (function() {
	var _this;

	// Global static vars
	var MAX_WIDTH = 768;
	var MAX_HEIGHT = 1024;
	var TARGET_FPS = 1;

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
			_this.width = (window.innerWidth <= MAX_WIDTH)? window.innerWidth * window.devicePixelRatio  : MAX_WIDTH;
			_this.height = (window.innerHeight <= MAX_HEIGHT)? window.innerHeight * window.devicePixelRatio  : MAX_HEIGHT;
			_this.canvas.width = _this.width;
			_this.canvas.height = _this.height;
			_this.canvas.style.width = (_this.width / window.devicePixelRatio) + "px";
			_this.canvas.style.height = (_this.height / window.devicePixelRatio) + "px";

			// Create stage and enable touch
			_this.stage = new createjs.Stage("game");
			createjs.Touch.enable(_this.stage);
			_this.stage.enableMouseOver(10);
			_this.stage.snapToPixelEnabled = true;

			// Setup score
			_this.score = Math.floor(Math.random() * 100);
		},
		start : function() {
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
			_this.addEntity(_this.player);

			// Create HUD
			_this.hud = new HUD(_this, _this.player);

			// Create asteroids
			for(var i = 0; i < INITIAL_ASTEROID_COUNT; i++) {
				var asteroid = new Asteroid();
				
				// Set random start location
				asteroid.x = 300; //Math.random() * _this.width;
				asteroid.y = 500; //Math.random() * _this.height;
				asteroid.setShape(new createjs.Shape());

				// Add to entity list
				_this.addEntity(asteroid);
			}
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
			 	_this.mouseDown = e;
			});

			_this.canvas.addEventListener("mousemove", function(e) {
				_this.mouseMove = e;
			});

			_this.canvas.addEventListener("mouseup", function(e) {
			 	_this.mouseUp = e;
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

			navigationLine.graphics.clear().setStrokeStyle(2).beginStroke("#0000ff").dashedLineTo(this.player.x, this.player.y, this.lastTouchX, this.lastTouchY, 4);
		},

		addEntity : function(entity, index) {
			// Adds object that conforms to entity interface
			_this.entities.push(entity);
			_this.stage.addChild(entity.shape);
		},

		getDimensions : function() {
			return { width: _this.width, height: _this.height};
		},

		tick : function() {
			_this.meter.begin();
			++this.tickCount;

			// Update and render navigation
			_this.updateNavigation();
			_this.renderNavigation();

			// Update HUD 
			_this.hud.update();

			// Update and render loop
			for(var i = 0; i < _this.entities.length; i++) {
				if(_this.entities[i] == null) continue;

				_this.entities[i].update();
				_this.entities[i].render();

				// Remove entity from stage if its dead
				if(_this.entities[i].isDead()) {
					_this.stage.removeChild(_this.entities[i].shape);
					delete _this.entities[i];
					continue;
				}

				// Collision detection
				for(var j = i + 1; j < _this.entities.length; j ++) {
					if(_this.entities[j] == null) continue;

					var e1 = _this.entities[i];
					var e2 = _this.entities[j];
					// Check if entities can collide
					if(e1.canCollideWidth(e2)) {
						if(_this.physics.hasCollided(e1, e2)) {
							// Tell entities that they've collided
							//e1.collidedWith(e2);
							//e2.collidedWith(e1);
						}
					}
				}
			}

			// Draw everything to stage
			_this.stage.update();

			_this.meter.end();
		},
	}

	return SpaceRocks;
})();

window.onload = function() {
	window.spaceRocks = new SpaceRocks(); 
	window.spaceRocks.start();
}