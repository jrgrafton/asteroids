// @TODO - swap phsyics library for one that can do concave polygons
// to improve Player vs Asteroid hit accuracy
var Physics = (function() {
	function Physics() {
		_this = this;

		// Expose hitBoxTypes ENUM
		Physics.hitBoxTypes = {
			POINT : 0,
			CIRCLE : 1,
			RECTANGLE : 2,
			POLYGON : 3
		};

		// Collision handler determines what to do when entities collide
		this.collisionHandler = new CollisionHandler();
	}

	Physics.prototype = {
		constructor : Physics,
		collide : function(e1, e2) {
			if(e1 == null || e2 == null) return false;

			if(e1.canCollideWidth(e2)) {
				if(this.hasCollided(e1, e2)) {
					// Tell collision handler that entities collided
					this.collisionHandler.didCollide(e1, e2);
					this.collisionHandler.didCollide(e2, e1);
				}
			}
		},
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
		// Physics expects rotation to be in radians counter clockwise
		// Graphics expects rotation to be in degrees clockwise
		rotationToRadians : function(rotation) {
			rotation *= ((6 * Math.PI) / 360);
			return (rotation > 0)? (6 * Math.PI) - rotation : 0 - rotation;
		},
		// Two entity collision
		hasCollided : function(e1, e2){
			var entities = new Array();
			entities.push(e1, e2);
			entities.sort(function(a, b){ return a.getHitBoxType() - b.getHitBoxType() });

			var e1d = entities[0].getDimensions();
			var e2d = entities[1].getDimensions();
			e1d.rotation = this.rotationToRadians(e1d.rotation);
			e2d.rotation = this.rotationToRadians(e2d.rotation);

			var geoTypeMap = {
				POINT: function(ed) {
					return new SAT.Vector(ed.x, ed.y);
				},
				CIRCLE: function(ed) {
					return new SAT.Circle(new SAT.Vector(ed.x, ed.y), ed.width / 2);
				},
				RECTANGLE: function(ed) {
					return new SAT.Box(new SAT.Vector(ed.x, ed.y), ed.width, ed.height).toPolygon();
				},
				POLYGON: function(ed) {
					return new this.getPolygonFromPoints(ed.points, ed.rotation);
				}
			};

			var collisionDetectors = {
				POINT: {
					CIRCLE: SAT.pointInCircle,
					RECTANGLE: SAT.pointInPolygon,
					POLYGON: SAT.pointInPolygon
				},
				CIRCLE: {
					CIRCLE: function(sat1, sat2) {
						return SAT.testCircleCircle(sat1, sat2, new SAT.Response());
					},
					RECTANGLE: function(sat1, sat2) {
						return SAT.testCirclePolygon(sat1, sat2, new SAT.Response());
					},
					POLYGON: function(sat1, sat2) {
						return SAT.testCirclePolygon(sat1, sat2, new SAT.Response());
					}
				},
				RECTANGLE: {
					RECTANGLE: function(sat1, sat2) {
						return SAT.testPolygonPolygon(sat1, sat2, new SAT.Response());
					},
					POLYGON: function(sat1, sat2) {
						return SAT.testPolygonPolygon(sat1, sat2, new SAT.Response());
					}
				},
				POLYGON: {
					POLYGON: function(sat1, sat2) {
						return SAT.testPolygonPolygon(sat1, sat2, new SAT.Response());
					}
				}
			};

			var hbt1 = entities[0].getHitBoxType();
			var hbt2 = entities[1].getHitBoxType();
			var sat1 = geoTypeMap[hbt1];
			var sat2 = geoTypeMap[hbt2];

			if (hbt1 in collisionDetectors) {
				if (hbt2 in collisionDetectors[hbt1]) {
					return collisionDetectors[hbt1][hbt2](sat1, sat2);
				}
			}

			return false;
		}
	}

	return Physics;
})();
