var CollisionHandler = (function() {
	function CollisionHandler(){};

	CollisionHandler.prototype = {
		constructor : CollisionHandler,
		didCollide : function(e1, e2) {
			//console.log("[collision] " + e1.className() + " --> " + e2.className());

            var collisionMap = {
                "Asteroid": {
                    "Missile": function (e1, e2) {
                        // Explode missile
                        e2.explode();
                    },
					"MissileExplosion": function (e1, e2) {
                        // Explode asteroid
                        if(!e1.isDead()) {
                            e1.explode();
                            window.spaceRocks.addScore(10 * (e1.sizeIndex + 1), e2.x, e2.y);
                        }
                    },
					"Player": function (e1, e2) {
                        window.spaceRocks.addScore(10 * (e1.sizeIndex + 1), e2.x, e2.y);
                        e1.explode();
                        e2.explode();
                    }
                },
                "Player": {
					"Alien": function (e1, e2) {
                        // Explode player
                        e1.explode();
                    },
                    "Lazer": function (e1, e2) {
                        // Explode player
                        e1.explode();
                        e2.explode();
                    }
                },
                "Alien": {
                    "Missile": function (e1, e2) {
                        // Explode missile
                        e2.explode();
                    },
                    "MissileExplosion": function (e1, e2) {
                        // Explode alien
                        if(!e1.isDead()) {
                            e1.explode();
                            window.spaceRocks.addScore(120, e1.x, e1.y);
                        }
                    },
					"Lazer": function (e1, e2) {
                        // Explode alien and lazer
                        e1.explode();
                        e2.explode();
                    }
                },
                "Lazer": {
                    "Missile": function (e1, e2) {
                        // Explode lazer and missile
                        e1.explode();
                        e2.explode();
                    },
                    "MissileExplosion": function (e1, e2) {
                        // Explode alien
                        e1.explode();
                        e2.explode();
                    }
                }
            };

            if (e1.className() in collisionMap) {
                if (e2.className() in collisionMap[e1.className()]) {
                    collisionMap[e1.className()][e1.className()](e1, e2);
                }
            }
		}
	}

	return CollisionHandler;
})();
