define(['jquery', 'app/eventmanager', 'app/textStore', 'app/gameoptions',
        'app/graphics/gameboard', 'app/graphics/world', 'app/graphics/resources', 
        'app/graphics/loot', 'app/graphics/magic', 'app/graphics/audio'], 
		function($, EventManager, TextStore, Options, BoardGraphics, WorldGraphics, ResourceGraphics,
				LootGraphics, MagicGraphics, AudioGraphics) {
	
	var textStore;
	var costsOn = false;
	
	function handleDrawRequest(requestString, options) {
		var moduleString = requestString.substring(0, requestString.indexOf('.'));
		requestString = requestString.substring(requestString.indexOf('.') + 1);
		
		var module = null;
		switch(moduleString.toLowerCase()) {
			case 'board':
				module = BoardGraphics;
				break;
			case 'world':
				module = WorldGraphics;
				break;
			case 'resource':
				module = ResourceGraphics;
				break;
			case 'loot':
				module = LootGraphics;
				break;
			case 'magic':
				module = MagicGraphics;
				break;
			case 'audio':
				module = AudioGraphics;
				break;
		}
		
		var time = 0;
		if(module != null && module.handleDrawRequest) {
			time = module.handleDrawRequest(requestString, options);
		}
		
		setTimeout(function() {
			EventManager.trigger('graphicsActionComplete');
		}, time);
	}
	
	function showCosts(building) {
		if(!Options.get('showCosts') && !costsOn) {
			var pile;
			if(building) {
				if(building.el) building = building.el();
				pile = building.find('.blockPile');
			} else {
				pile = $('.blockPile');
			}
			pile.addClass('showCosts');
			setTimeout(function() {
				pile.addClass('fadeCosts');
			}, 10);
			setTimeout(function() {
				pile.removeClass('showCosts fadeCosts');
			}, 510);
		}
	}
	
	function toggleCosts(visible) {
		if(visible) {
			costsOn = true;
			$('.gameBoard').addClass('showCosts');
		} else {
			costsOn = false;
			$('.gameBoard').addClass('fadeCosts');
			setTimeout(function() {
				$('.gameBoard').removeClass('showCosts fadeCosts');
			}, 500);
		}
	}
	
	function changeTiles(tileTypes, classToAdd, classToRemove) {
		var tileClasses = '';
		tileTypes.forEach(function(type) {
			tileClasses += (tileClasses.length > 0 ? ', ' : '') + '.tile.' + type;
		});
		var tiles = $(tileClasses);
		tiles.addClass('hidden');
		setTimeout(function() {
			BoardGraphics.el().removeClass(classToRemove).addClass(classToAdd);
			tiles.removeClass('hidden');
		}, 300);
	}
	
	var Graphics = {
		init: function() {
			$('body').removeClass('night');
			
			textStore = new TextStore();
			
			EventManager.bind('draw', handleDrawRequest);
			
			EventManager.bind('monsterKilled', this.monsterKilled);
			EventManager.bind('newEntity', this.addToWorld);
			EventManager.bind('healthChanged', this.updateHealthBar);
			EventManager.bind('dayBreak', this.handleDayBreak);
			EventManager.bind('blockDown', showCosts);
			EventManager.bind('toggleCosts', toggleCosts);
			
			BoardGraphics.init();
			WorldGraphics.init();
			ResourceGraphics.init();
			LootGraphics.init();
			MagicGraphics.init();
			if(!require('app/engine').isSilent()) {
				AudioGraphics.init();
			}
		},
		
		isReady: function() {
			return textStore && textStore.isReady();
		},
		
		getText: function(key) {
			return textStore.get(key);
		},
		
		attachHandler: function(moduleName, event, element, handler) {
			var module = require('app/graphics/' + moduleName.toLowerCase());
			module.attachHandler(event, element, handler);
		},
		
		get: function(selector, context, returnEmpty) {
			var ret = context ? context.find(selector) : $(selector);
			if(returnEmpty || ret.length > 0) {
				return ret;
			}
			return null;
		},
		
		remove: function(thing) {
			var el = thing.el ? thing.el() : thing;
			thing.remove();
		},
		
		createResourceContainer: function(resource, number) {
			var cols = 1;
			if(number > 5) {
				cols = 2;
				number = Math.ceil(number / 2);
			}
			var el = $('<div>').addClass('container')
				.addClass(resource).addClass('width' + cols)
				.addClass('height' + number);
			$('<div>').addClass('ghost').appendTo(el);
			return el;
		},
		
		make: function(className) {
			return $('<div>').addClass(className);
		},
		
		addToWorld: function(entity) {
			if(entity.el == null) {
				WorldGraphics.add(entity);
			} else {
				var g = require('app/graphics/graphics');
				WorldGraphics.add(entity.el());
				if(entity.p) {
					g.setPosition(entity, entity.p());
				}
				g.updateSprite(entity);
			}
		},
		
		worldWidth: function() {
			return $('.world').width();
		},
		
		addToScreen: function(entity) {
			$('body').append(entity.el ? entity.el() : entity);
		},
		
		addToBoard: function(entity) {
			$('.gameBoard').append(entity.el ? entity.el() : entity);
		},
		
		addToMenu: function(entity) {
			$('.menuBar').append(entity.el ? entity.el() : entity);
		},
		
		hide: function(entity) {
			(entity.el ? entity.el() : entity).addClass('hidden');
		},
		
		show: function(entity) {
			(entity.el ? entity.el() : entity).removeClass('hidden');
		},
		
		addTilesToContainer: function(entities) {
			var elements = document.createDocumentFragment();
			for(var e in entities) {
				elements.appendChild(entities[e].el()[0]);
			}
			document.getElementById('tileContainer').appendChild(elements);
		},
		
		addMonster: function(monster, side) {
			var el = monster.el();
			el.css('left', '100%');
			el.appendTo('.world');
			if(side == 'left') {
				el.css('left', -el.width() + 'px');
			}
			monster.p(el.position().left + el.width() / 2);
		},
		
		moveCelestial: function(entity, pos) {
			var el = entity.el();
			var worldWidth = $('.world').width();
			var height = (Math.abs(pos - worldWidth / 2) / (worldWidth / 2)) * 30;
			el.css({
				left: (pos - (el.width() / 2)) + 'px',
				top: Math.floor(height) + 'px'
			});
		},
		
		setNight: function(night) {
			if(night) {
				$('body').addClass('night');
			} else {
				$('body').removeClass('night');
			}
		},
		
		phaseTransition: function(celestial, callback) {
			celestial.el().css('top', '100%');
			$('body').toggleClass('night');
			var _g = this;
			setTimeout(function() {
				if($('body').hasClass('night')) {
					celestial.animation(1);
				} else {
					celestial.animation(0);
				}
				celestial.el().css('left', '0px');
				
				setTimeout(function() {
					_g.raiseCelestial(celestial);
					if(callback != null) {
						callback();
					}
				}, 400);
			}, 300);
		},
		
		raiseCelestial: function(celestial) {
			celestial.el().css({
				top: '100%',
				left: '0px'
			});
			celestial.p(15);
			this.moveCelestial(celestial, celestial.p());
		},
		
		updateSprite: function(entity) {
			var el = entity.el();
			var spriteRow = entity.tempAnimation == null ? entity.animationRow : entity.tempAnimation;
			el.css('background-position', -(entity.frame * el.width()) + "px " + -(spriteRow * el.height()) + 'px');
			$('.animationLayer', el).css('background-position', -(entity.frame * el.width()) + "px " + -(spriteRow * el.height()) + 'px');
		},
		
		setPosition: function(entity, pos) {
			// Don't spawn chests off-screen
			if(entity.lootable && pos <= 20) {
				pos = 20;
				entity.p(pos);
			}
			if(entity.lootable && pos >= this.worldWidth() - 20) {
				pos = this.worldWidth() - 20;
				entity.p(pos);
			}
			var el = entity.el ? entity.el() : entity;
			el.css('left', (pos - (el.width() / 2)) + "px");
		},
		
		selectTile: function(tile) {
			tile.el().addClass('selected');
		},
		
		deselectTile: function(tile) {
			tile.el().removeClass('selected');
		},
		
		animateMove: function(entity, pos, callback, stopShort) {
			var el = entity.el();
			var dist = Math.abs(entity.p() - pos);
			el.stop().animate({
				'left': pos - (entity.width() / 2)
			}, {
				duration: dist * entity.speed(), 
				easing: 'linear', 
				step: function(now, tween) {
					entity.p(now + entity.width() / 2);
					if(stopShort != null && stopShort()) {
						el.stop();
						if(callback != null) {
							callback();
						}
					}
				},
				complete: callback
			});
		},
		
		raiseBuilding: function(building, callback) {
			var el = building.el();
			$('.blockPile', el).animate({
				'top': '120px'
			}, {
				duration: 5000,
				easing: 'linear'
			});
			
			el.animate({
				'bottom': 0
			}, {
				duration: 5000,
				easing: 'linear',
				complete: function() {
					el.find('.blockPile').remove();
					if(building.options.type.tileMod) {
						changeTiles(
							[building.options.type.tileMod], 
							building.options.type.tileMod + building.options.type.tileLevel,
							building.options.type.tileMod + (building.options.type.tileLevel - 1)
						);
					}
					callback(building);
				}
			});
		},
		
		sinkBuilding: function(building) {
			var el = building.el();
			$('.blockPile', el).stop().css('top', '-60px');
			el.stop().css('bottom', '-80px');
		},
		
		pickUpBlock: function(block) {
			block.el().appendTo('.heldBlock');
		},
		
		dropBlock: function(block, destinationBuilding) {
			var container = $('.blockPile', destinationBuilding.el())
				.find('.container.' + block.options.type.className);
			block.el().appendTo(container);
			block.el().css('top', '0px');
		},
		
		updateBlock: function(block) {
			$('div', block.el()).width((block.quantity() / block.max * 100) + '%');
		},
		
		getStatusContainer: function() {
			var healthContainer = $('.statusContainer');
			if(healthContainer.length == 0) {
				healthContainer =  $('<div>').addClass('statusContainer')
					.append($('<div>').addClass('hearts')).appendTo('.gameBoard');
			}
			return healthContainer;
		},
		
		updateExperience: function(xp, toLevel) {
			var xpBar = $('.xpBar');
			if(xpBar.length == 0) {
				xpBar = $('<div>').addClass('xpBar').addClass('litBorder')
					.addClass('hidden').append($('<div>').addClass('nightSprite'))
					.append($('<div>').addClass('fill').addClass('hidden')).appendTo('.gameBoard');
			}
			xpBar.find('.fill').css('height', (xp / toLevel * 100) + "%");
			setTimeout(function() {
				$('.xpBar, .fill').removeClass('hidden');
			}, 100);
		},
		
		updateHealth: function(health, maxHealth) {
			
			var HEALTH_PER_HEART = 10;
			var statusContainer = $('.hearts', this.getStatusContainer());
			for(var i = 0, n = Math.ceil(maxHealth / HEALTH_PER_HEART) - statusContainer.children().length; i < n; i++) {
				$('<div>').addClass('heart').addClass('hidden').append($('<div>')
						.addClass('mask')).append($('<div>').addClass('mask')
						.addClass('nightSprite')).append($('<div>')
						.addClass('bar')).appendTo(statusContainer);
			}
			for(var i = Math.ceil(maxHealth / HEALTH_PER_HEART); i > 0; i--) {
				var heart = statusContainer.children()[i - 1];
				if(health >= HEALTH_PER_HEART) {
					$(heart).removeClass('empty');
					$('.bar', heart).css('width', '100%');
					health -= HEALTH_PER_HEART;
				} else if(health > 0) {
					$(heart).removeClass('empty');
					$('.bar', heart).css('width', (health / HEALTH_PER_HEART * 100) + '%');
					health = 0;
				} else {
					$(heart).addClass('empty');
					$('.bar', heart).css('width', '0%');
				}
			}
			setTimeout(function() {
				$('.heart.hidden').removeClass('hidden');
			}, 100);
		},
		
		updateShield: function(shield, maxShield) {
			var container = this.getStatusContainer();
			var el = $('.shield', container);
			if(el.length == 0) {
				el = $('<div>').addClass('shield').addClass('hidden')
					.append($('<div>')).insertAfter('.hearts', container);
			}
			if(shield > 0) {
				setTimeout(function() {
					el.removeClass('hidden');
				}, 100);
				$('div', el).width((shield / maxShield * 100) + "%");
			} else {
				$('div', el).width("0%");
				el.addClass('hidden');
			}
		},
		
		updateSword: function(sword, maxSword) {
			var container = this.getStatusContainer();
			var el = $('.sword', container);
			if(el.length == 0) {
				el = $('<div>').addClass('sword').addClass('hidden')
					.append($('<div>')).insertAfter('.hearts', container);
			}
			if(sword > 0) {
				setTimeout(function() {
					el.removeClass('hidden');
				}, 100);
				$('div', el).width((sword / maxSword * 100) + "%");
			} else {
				$('div', el).width("0%");
				el.addClass('hidden');
			}
		},
		
		stop: function(entity) {
			entity.el().stop();
		},
		
		fadeOut: function(callback) {
			$('.gameBoard').addClass('hidden');
			if(callback) {
				setTimeout(callback, 1000);
			}
		},
		
		notifySave: function() {
			$('.saveSpinner').addClass('active');
			setTimeout(function(){
				$('.saveSpinner').removeClass('active');
			}, 1500);
		},
		
		fireArrow: function(arrowEntity, callback) {
			var start = arrowEntity.options.fireFrom,
				end = arrowEntity.options.fireTo;
			var dist = end - start;
			var ARROW_TIME = 1000;
			var arrow = arrowEntity.el();
			arrow.addClass(dist > 0 ? 'right' : 'left');
			arrow.attr('style', 'transform: translateX(' + start + 'px);');
			$('.world').append(arrow);
			
			arrow.css('left'); // Force a redraw before animation
			
			// Move arrow to top of arc
			arrow.attr('style', 'transform: translateX(' + (start + dist/2) + 'px);');
			arrow.addClass('top');
			
			// Move arrow to end of arc
			setTimeout(function() {
				arrow.attr('style', 'transform: translateX(' + (start + dist) + 'px);');
				arrow.removeClass('top').addClass('bottom');
				setTimeout(function() {
					// Remove arrow
					arrow.remove();
					if(callback) {
						callback(arrow);
					}
				}, ARROW_TIME / 2);
			}, ARROW_TIME / 2);
			
			return arrowEntity;
		},
		
		levelUp: function(dude) {
			var p = dude.p();
			var effect = $('<div>').addClass('levelEffect').css('left', (p - 1) + 'px').appendTo('.world');
			effect.css('left'); // force redraw before animation
			effect.css('height', '100%');
			setTimeout(function() {
				effect.css({
					'width': '100%',
					'left': '0px',
					'opacity': 0
				});
			}, 500);
		},
		
		updateHealthBar: function(entity) {
			var bar = entity.el().find('.healthBar div');
			if(bar.length > 0) {
				var healthPercent = Math.floor(entity.hp() / entity.maxHealth() * 100);
				bar.css('width', healthPercent + '%');
			}
		},
		
		handleDayBreak: function(dayNumber) {
			require(['app/graphics/graphics'], function(Graphics) {
				var txt = Graphics.getText('DAY');
				var notifier = $('<div>').addClass('dayNotifier').text(txt + " " + dayNumber).appendTo('.world');
				setTimeout(function() {
					$('.monster, .treasureChest').remove();
					notifier.addClass('hidden');
				}, 3000);
				setTimeout(function() {
					notifier.remove();
				}, 3500);
			});
		},
		
		monsterKilled: function(monster) {
			monster.el().find('.healthBar').addClass('hidden');
		},
		
		enablePlayButton: function() {
			$('#loadingScreen .saveSpinner').addClass('hidden');
			$('#playButton').removeClass('hidden').text(Graphics.getText('PLAY'));
		},
		
		landDragon: function(dragon, cb) {
			dragon.el().css('transform', 'translateY(-100%)')
			dragon.p(this.worldWidth() - 75);
			this.addToWorld(dragon);
			dragon.el().css('left'); // force redraw
			dragon.el().css('transform', 'translateY(0)');
			setTimeout(function() {
				dragon.setPosture('idle', 500);
				BoardGraphics.el().addClass('tilted');
				changeTiles(['clay', 'cloth', 'grain'], 'dragon', '');
			}, 300);
			setTimeout(function() {
				BoardGraphics.el().removeClass('tilted');
			}, 600);
			if(cb) {
				setTimeout(cb, 900);
			}
		}
	};
	
	return Graphics;
});