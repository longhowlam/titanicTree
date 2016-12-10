! function(name, context, definition) {
	if (typeof module != 'undefined' && module.exports) module.exports = definition()
	else if (typeof define == 'function' && define.amd) define(definition)
	else context[name] = definition()
}('dtree', this, function() {

	var win = window,
		doc = document,
		d3 = win.d3 || {};

	/***************************************************************************/
  /***************************************************************************/
  /***************************************************************************/

	(function() {
		var cache = {};

		window.tmpl = function tmpl(str, data) {
			// Figure out if we're getting a template, or if we need to
			// load the template - and be sure to cache the result.

			str = cache[str] = cache[str] || document.getElementById(str).innerHTML;


			var fn = !/\W/.test(str) ?
				cache[str] = cache[str] ||
				tmpl(document.getElementById(str).innerHTML) :

			// Generate a reusable function that will serve as a template
			// generator (and which will be cached).
			new Function("obj",
				"var p=[],print=function(){p.push.apply(p,arguments);};" +

			// Introduce the data as local variables using with(){}
			"with(obj){p.push('" +

			// Convert the template into pure JavaScript
			str
				.replace(/[\r\t\n]/g, " ")
				.split("<%").join("\t")
				.replace(/((^|%>)[^\t]*)'/g, "$1\r")
				.replace(/\t=(.*?)%>/g, "',$1,'")
				.split("\t").join("');")
				.split("%>").join("p.push('")
				.split("\r").join("\\'") + "');}return p.join('');");


			// Provide some basic currying to the user
			return data ? fn(data) : fn;
		};
	})();

	/***************************************************************************/
  /***************************************************************************/
  /***************************************************************************/

	d3.helper = {};

	d3.helper.tooltip = function(method) {
		var tooltipDiv;
		var bodyNode = d3.select('body').node();
		var attrs = {};
		var text = '';
		var styles = {};
		var reg = false;


		function getScrollTop() {
			if (typeof pageYOffset != 'undefined') {
				//most browsers
				return pageYOffset;
			} else {
				var B = document.body; //IE 'quirks'
				var D = document.documentElement; //IE with doctype
				D = (D.clientHeight) ? D : B;
				return D.scrollTop;
			}
		};

		function windowDim() {
			var winW = 630,
				winH = 460;
			if (document.body && document.body.offsetWidth) {
				winW = document.body.offsetWidth;
				winH = document.body.offsetHeight;
			}

			if (document.compatMode == 'CSS1Compat' &&
				document.documentElement &&
				document.documentElement.offsetWidth) {
				winW = document.documentElement.offsetWidth;
				winH = document.documentElement.offsetHeight;
			}
			if (window.innerWidth && window.innerHeight) {
				winW = window.innerWidth;
				winH = window.innerHeight;
			}
			var scrollbar = 15;
			return {
				w: winW - scrollbar,
				h: winH
			};
		};

		function tooltip(selection) {

			selection.on('mouseover.tooltip', function(pD, pI) {
				if (_inProgress) {
					return;
				}

				predictionPath(pD);

				var name, value;
				// Clean up lost tooltips
				d3.select('body').selectAll('div.tooltip').remove();
				// Append tooltip
				tooltipDiv = d3.select('body').append('div');
				tooltipDiv.attr(attrs);
				tooltipDiv.style(styles);

				var isRoot = pD.method;
				var offset = 200
				var outerWidth = offset + 25;
				var left = pD.x;
				var pos = 'sw';
				var arrow = 's';

				if ((pD.x + outerWidth) > windowDim().w) {
					left = pD.x - offset;
					pos = 'se';
				}

				if (isRoot) {
					pos = 'nw';
					top = pD.y + 105;
					arrow = 'n';
				}

				tooltipDiv.style({
					left: left + 'px',
					top: top,
					position: 'absolute',
					'z-index': 1001
				});

				tooltipDiv.html(function(d, i) {
					var t = window.tmpl(method === 'class' ? 'classification-tip' : 'regression-tip', {
						pD: {
							pos: pos,
							arrow: arrow,
							label: pD.label,
							n: pD.n,
							deviance: pD.deviance,
							loss: pD.loss,
							yval: pD.yval,
							type: pD.type,
							splitVar: pD.splitVar
						}
					});

					return t;
				});
			})
				.on('mousemove.tooltip', function(pD, pI) {
				if (_inProgress || !tooltipDiv) {
					return;
				}

				var isRoot = pD.method;
				var offset = 200
				var outerWidth = offset + 25;
				var left = pD.x;
				var top = pD.y - 50;
				var pos = 'sw';
				var arrow = 's';

				if ((pD.x + outerWidth) > windowDim().w) {
					left = pD.x - offset;
					pos = 'se';
				}

				if (isRoot) {
					pos = 'nw';
					top = pD.y + 105;
					arrow = 'n';
				}

				tooltipDiv.style({
					left: left + 'px',
					top: top + 'px',
					position: 'absolute',
					'z-index': 1001
				});

				// Keep updating the text, it could change according to position
				tooltipDiv.html(function(d, i) {
					var t = window.tmpl(method === 'class' ? 'classification-tip' : 'regression-tip', {
						pD: {
							pos: pos,
							arrow: arrow,
							label: pD.label,
							n: pD.n,
							deviance: pD.deviance,
							loss: pD.loss,
							yval: pD.yval,
							type: pD.type,
							splitVar: pD.splitVar
						}
					});

					return t;
				});

				if (method === 'class') {

					var w = 190;
					var h = 33;
					var barPadding = 1;
					var N = 4;
					var dataset = pD.prob;

					var heightScale = d3.scale.linear()
						.domain([0, d3.max(dataset)])
						.range([0, h]);

					//Create SVG element
					var svg = d3.select("#surface")
						.append("svg")
						.attr("width", w)
						.attr("height", h);

					svg.selectAll("rect")
						.data(dataset)
						.enter()
						.append("rect")
						.attr('fill', function(d, i) {
						return leafFillScale(i);
					})
						.attr("x", function(d, i) {
						return i * (w / dataset.length);
					})
						.attr("y", function(d) {
						return (h - heightScale(d));
					})
						.attr("width", function() {
						return w / dataset.length - barPadding;
					})
						.attr("height", heightScale);

				} // end - if 

			})
				.on('mouseout.tooltip', function(pD, pI) {
				// Remove tooltip
				if (tooltipDiv) {
					tooltipDiv.remove();
				}
			});

		}

		tooltip.attr = function(x) {
			if (!arguments.length) return attrs;
			attrs = x;
			return this;
		};

		tooltip.style = function(x) {
			if (!arguments.length) return styles;
			styles = x;
			return this;
		};

		tooltip.text = function(x) {
			if (!arguments.length) return text;
			text = d3.functor(x);
			return this;
		};

		return tooltip;
	};

  /***************************************************************************/
  /***************************************************************************/
  /***************************************************************************/

	/*
   * { method: 'class', rule: { depVars: {}, indVars: {} } }
   */
	function Legend(options) {

		this.options = options;
		Legend.palette = options.palette || Legend.palette;
		this.render();

		var el = d3.select('#legend-toggle');
		el.on('click', function(e) {
			var expanded = el.html() === '-';
			el.html(expanded ? '+' : '-');

			var depLegend = d3.select('#dep-legend');
			depLegend.style('display', expanded ? 'none' : 'block');
		});
	};

	/** Default color palette */
	Legend.palette = {
		range: ['#F7F0F9', '#BB80C1'],
		colors: [
				'#8ED3C6',
				'#FFFFA8',
				'#BDBBDD',
				'#FB816E',
				'#80B0D7',
				'#FDB550',
				'#B4DE51',
				'#F8CCE7',
				'#D9D9D9',
				'#CBEAC0',
				'#FFEE53'
		]
	};

	Legend.prototype.channels = function() {
		var c = {}, index = 0;

		this.options.rule.indVars.forEach(function(v) {
			index = index > Legend.palette.colors.length - 1 ? 0 : index;
			c[v] = Legend.palette.colors[index];
			index++;
		});

		return c;
	};

	Legend.prototype.render = function(value) {
		this.variables();
		if (this.options.method === 'class') {
			var el = d3.select("#dep-legend ul"),
				levels = this.options.rule.depVars.levels;
			levels.forEach(function(variable, index) {
				var color = leafFillScale(index);
				el.append("li").html(function(d) {
					return '<div class="shape square" style="background-color:' + color + '"><div class="split-info">' + variable + '</div></div>';
				});
			});

		} else {
			this.gradient();
		}
	};

	Legend.prototype.variables = function() {
		var legend = this.options,
			channels = this.channels(),
			method = this.options.method;

		// -- attache legend tpl --
		d3.select('#legend').html(function() {
			return window.tmpl(method === 'class' ? 'classification-legend' : 'regression-legend', {
				legend: legend,
				range: Legend.palette.range
				//palette: palette
			});
		});

		// -- append vars to the legend tpl --
		var el = d3.select("#legend-vars");
		for (var variable in channels) {
			var color = channels[variable];
			el.append('li').html(function(d) {
				return '<div class="shape circle" style="background-color:' + color + '"><div class="split-info">' + variable + '</div></div>';
			});
		}

	};

	Legend.prototype.gradient = function() {

		var legend = d3.select("#gradient").append("svg:svg");
		legend.attr('width', '180')
		legend.append("rect");

		var n = 360;
		var data = d3.range(n);

		// -- build the gradients --
		var defs = legend.append("defs");

		function buildGradient(gradid, i) {
			var j = i;
			var dtheta = Math.PI * 2 / n;
			var theta1 = dtheta * j + dtheta / 2;
			var theta2 = theta1 + Math.PI;
			var x1 = Math.cos(theta1) * 50 + 50;
			var x2 = Math.cos(theta2) * 50 + 50;
			var y1 = Math.sin(theta1) * 50 + 50;
			var y2 = Math.sin(theta2) * 50 + 50;

			var gradient = defs.append("svg:linearGradient")
				.attr("id", gradid + j)
				.attr("x1", x1 + "%")
				.attr("y1", y1 + "%")
				.attr("x2", x2 + "%")
				.attr("y2", y2 + "%");

			gradient.append("svg:stop")
				.attr("offset", 0 + "%")
				.attr("stop-color", Legend.palette.range[1])
				.attr("stop-opacity", 0.9);

			gradient.append("svg:stop")
				.attr("offset", 100 + "%")
				.attr("stop-color", Legend.palette.range[0])
				.attr("stop-opacity", 0.9);

			return gradient;
		};

		d3.range(n).forEach(function(d, i) {
			buildGradient("grad", i);
		});

		legend.append("rect")
			.attr("width", "158")
			.attr("height", "25")
			.attr("fill", "url(#grad0)");
	};

	/***************************************************************************/
  /***************************************************************************/
  /***************************************************************************/

  var m = [20, 120, 20, 120],
		w = 1880 - m[1] - m[3],
		h = 1580 - m[0] - m[2],
		i = 0,
		container,
		palette = {},
		_inProgress = false,		
		root,
		leafFillScale,
		borderScale,
		tree,
		diagonal,
		vis,
		linkScale,
		colorMap,
		STROKE_CALLBACK = 'lightgray',
		RECT_WIDTH = 35,
		RECT_HEIGHT = 35,
		MAX_LINK_WIDTH = 20,
		MIN_LINK_WIDTH = 1.5,
		MIN_BORDER_WIDTH = 1,
		MAX_BORDER_WIDTH = 15,
		visibility = {
			labels: true,
			borders: false,
			legend: true,
			colors: true,
			path: false,
			labelLength: '',
			area: true
		};

	var resize = function(treeEl) {
		treeEl = treeEl || $('#_tree'),
		parentEl = treeEl.parent(),
		width = parentEl.width() - (d3.select('#legend-container').classed('hide') ? 0 : 200);

		treeEl.attr('width', width);
		treeEl.attr('height', $(window).height());
		tree.size([width, width]);

		if (this.resizeTO) clearTimeout(this.resizeTO);
		this.resizeTO = setTimeout(function() {
			update(root);
		}, 500);
	};

	// ==========================================================================

	function loadDataset(o) {		
		container = d3.select('#' + o.id);

		leafFillScale = d3.scale.linear();
		borderScale = d3.scale.linear();
		tree = d3.layout.tree().size([h, w]);

		diagonal = d3.svg.diagonal()
		.projection(function(d) {
			return [d.x, d.y];
		});

		vis = container.append('svg:svg')
		.attr('id', '_tree')
		.attr('width', w + m[1] + m[3])
		.attr('height', h + m[0] + m[2] + 1000)
		.append('svg:g')
		.attr('transform', "translate(" + 0 + "," + m[0] + ")");

	  // global scale for link width
	  linkScale = d3.scale.linear();
	  colorMap = d3.scale.category10();

		root = o.data;
		root.x0 = 0;
		root.y0 = 0;

		STROKE_CALLBACK = meanInterpolation(root);

		linkScale = d3.scale.linear()
			.domain([root.summary.minn, root.n])
			.range([MIN_LINK_WIDTH, MAX_LINK_WIDTH]);

		var colorRange = o.palette ? o.palette.range : Legend.palette.range;
		if (root.method === 'class') {
			var last = root.legend.depVars.levels.length - 1;
			borderScale = d3.scale.linear()
				.domain([root.summary.minloss, root.summary.maxloss])
				.range([MIN_BORDER_WIDTH, MAX_BORDER_WIDTH]);

			leafFillScale = d3.scale.linear()
				.domain([0, last])
				.range(colorRange);
		} else {
			borderScale = d3.scale.linear()
				.domain([root.summary.mindev, root.summary.maxdev])
				.range([MIN_BORDER_WIDTH, MAX_BORDER_WIDTH]);

			leafFillScale = d3.scale.linear()
				.domain([root.legend.depVars.minyval, root.legend.depVars.maxyval]).range(colorRange);
		}

		palette = new Legend({
			palette: o.palette,
			method: root.method,
			rule: {
				depVars: root.legend.depVars,
				indVars: root.legend.indVars
			}
		}).channels();

		// toggle all at the given level

		function toggleAll(d) {
			if (d && d.children) {
				d.children.forEach(toggleAll);
				toggle(d);
			}
		}

		// Initialize the display to show a few nodes.
		root.children.forEach(toggleAll);

		update(root);

	}; // end 

	// ==========================================================================

	function update(source) {
		predictionPath(source);

		var duration = 500;

		// Compute the new tree layout.
		var nodes = tree.nodes(root).reverse();

		// Normalize for fixed-depth.
		nodes.forEach(function(d) {
			d.y = d.depth * 90;
		});

		// Update the nodes…
		var node = vis.selectAll("g.node")
			.data(nodes, function(d) {
			return d.id || (d.id = ++i);
		});

		// Enter any new nodes at the parent's previous position.
		var nodeEnter = node.enter().append("svg:g")
			.attr("class", "node")
			.attr("transform", function(d) {
			return "translate(" + source.x0 + "," + source.y0 + ")";
		})
			.on("click", function(d) {

			// -- ignore leaf nodes --
			if (d.type === 'leaf') {
				return;
			}

			// -- transition in progress --
			_inProgress = true;

			setTimeout(function() {
				_inProgress = false;
				predictionPath(d);
			}, 580);

			if (d3.event && d3.event.altKey) {
				collapseAll(d);
				expandAll(d);
			} else if (d3.event && (d3.event.ctrlKey || d3.event.metaKey)) {
				collapseAll(d);
				toggle(d);
			} else {
				toggle(d);
			}

			update(d);
		})
			.call(d3.helper.tooltip(root.method)
			.text(function(d) {
			return d;
		}));

		// ----------------------------------------------------------------------

		nodeEnter.append("svg:rect")
			.attr('class', 'tree-node')
			.attr('y', -1)
			.attr("x", function(d) {
			var width = d3.max([RECT_WIDTH, RECT_WIDTH])
			return (-width / 2);
		})
			.attr("width", 1e-6)
			.attr("height", 1e-6)
			.attr("rx", function(d) {
			return d.type === "split" ? 20 : 2; // make rect edges round
		})
			.attr("ry", function(d) {
			return d.type === "split" ? 20 : 2; // make rect edges round
		})
			.style("stroke", function(d) {
			return '#5b5b5b';
		})
		.style("stroke-width", strokeWidth) // -- border width --
		.style("fill", fill); // -- fill color --


		nodeEnter.append("svg:text")
			.attr("fill", "#333333")
			.attr('class', 'tree-label' + (visibility.labels ? '' : ' hide'))
			.attr("dy", 21)
			.attr("text-anchor", "middle")
			.attr("text-orig", nodeLabel)
			.text(function(d) {
			return trim(nodeLabel(d), visibility.labelLength);
		})
			.style("fill-opacity", 1e-6);

		// ----------------------------------------------------------------------      

		// Transition nodes to their new position.
		var nodeUpdate = node.transition()
			.duration(duration)
			.attr("transform", function(d) {
			return "translate(" + d.x + "," + d.y + ")";
		});

		// ----------------------------------------------------------------------      

		nodeUpdate.select('rect')
			.attr("width", function(d) {
			var width = d3.max([RECT_WIDTH, RECT_WIDTH]);
			return width;
		})
			.attr("height", RECT_HEIGHT)
			.style("stroke-width", strokeWidth)
			.style("fill", fill);

		// ------------------------------------------------------------------------      

		nodeUpdate.select("text").style("fill-opacity", 1);

		// Transition exiting nodes to the parent's new position.
		var nodeExit = node.exit().transition()
			.duration(duration)
			.attr("transform", function(d) {
			return "translate(" + source.x + "," + source.y + ")";
		})
			.remove();

		nodeExit.select('rect').attr("width", 1e-6).attr("height", 1e-6);
		nodeExit.select("text").style("fill-opacity", 1e-6);

		// Update the links
		var link = vis.selectAll("path.link")
			.data(tree.links(nodes), function(d) {
			return d.target.id;
		});

		// Enter any new links at the parent's previous position.
		link.enter().insert("svg:path", "g")
			.attr("class", "link")
			.attr('node-id', function(d) {
			return d.target.id;
		})
			.attr("d", function(d) {
			var o = {
				x: source.x0,
				y: source.y0
			};
			return diagonal({
				source: o,
				target: o
			});
		})
			.transition()
			.duration(duration)
			.attr("d", diagonal)
			.style("stroke-width", function(d) {
			return linkScale(d.target.n);
		})
			.style("stroke", STROKE_CALLBACK);

		// Transition links to their new position.
		link.transition()
			.duration(duration)
			.attr("d", diagonal)
			.style("stroke-width", function(d) {
			return linkScale(d.target.n);
		})
			.style("stroke", STROKE_CALLBACK);

		// Transition exiting nodes to the parent's new position.
		link.exit().transition()
			.duration(duration)
			.attr("d", function(d) {
			var o = {
				x: source.x,
				y: source.y
			};
			return diagonal({
				source: o,
				target: o
			});
		}).remove();

		// Stash the old positions for transition.
		nodes.forEach(function(d) {
			d.x0 = d.x;
			d.y0 = d.y;
		});
	}; // end - update

	// ========================================================================

	function predictionPath(pD) {
		//container.selectAll(".link").style("stroke", 'lightgray');
		d3.select("#tree").selectAll(".link").style("stroke", 'lightgray');
		d3.select('#path').html(function() {
			return window.tmpl('pred-path', { variable: root.legend.depVars.name });
		});

		var predPath = d3.select('#pred-path-list');
		predPath.html('');

		var markup = [];

		markup.push({
			pred: pD.yval,
			label: pD.label,
			shape: pD.type === 'leaf' ? 'square' : 'circle',
			color: fill(pD)
		});

		var ids = [pD.id];
		var path = tree.nodes([pD])[0][0];
		while (true) {
			var parent = path.parent;
			if (!parent) {
				break;
			}
			ids.push(parent.id);
			path = parent;

			markup.push({
				label: path.label,
				shape: path.type === 'leaf' ? 'square' : 'circle',
				color: fill(path)
			});
		}

		markup = markup.reverse();
		markup.forEach(function(item, i) {
			item.label = markup[i + 1] ? markup[i + 1].label : 'Prediction: ' + item.pred;

			TPL = '<div class="shape ' + item.shape + '" style="background-color:' + item.color + '">' +
				'<div class="split-info">' + item.label + '</div>' +
				'</div>';

			predPath.append("li").html(TPL);
		});

		//var paths = container.selectAll(".link")[0];
		var paths = d3.select("#tree").selectAll(".link")[0];
		paths.forEach(function(p) {
			var id = parseInt(p.getAttribute('node-id'), 10);

			for (var i = 0; i < ids.length; i++) {
				if (ids[i] === id) {
					d3.select(p).style("stroke", '#333');
					break;
				}
			}
		});

	};

	// ========================================================================

	// Toggle children.

	function toggle(d) {
		if (d.children) { // collapse
			d._children = d.children;
			d.children = null;
		} else { // expand
			d.children = d._children;
			d._children = null;
		}
	};

	// ========================================================================

	function fill(d) {
		var colorIndex = d.yval;

		if (root.method === 'class' && d.type === 'leaf') {
			colorIndex = 0;
			root.legend.depVars.levels.forEach(function(item, i) {
				if (item === d.yval) {
					colorIndex = i;
				}
			});
		}

		return visibility.colors ?
			d.type === 'leaf' ? leafFillScale(colorIndex) : palette[d.splitVar] : '#ffffff';
	};

	// ========================================================================

	function strokeWidth(d) {
		var value = root.method === 'class' ? d.loss : d.deviance;
		return !visibility.borders ? 1 : borderScale(value);
	};

	// ========================================================================

	// Node labels

	function nodeLabel(d) {
		var label = (d.type === 'leaf' ? d.yval : d.splitVal === 'multiple' ? '' : d.splitVal);
		return label === '' || isNaN(label) ? label : d3.round(label, 2);
	};

	function trim(txt, len) {
		len = len || '*';
		txt += '';
		return (isNaN(len) || len >= txt.length ? txt : txt.substring(0, len));
	};

	// ========================================================================

	/**
	 * A linear interpolator for link coloring in regression trees.
	 */
	function meanInterpolation(root) {
		function interpolator(d) {
			return 'lightgray';
		}

		return interpolator;
	};

	// =======================================================================

	function collapseAll(node) {
		function toggleAll(d) {
			if (d && d.children) {
				d.children.forEach(toggleAll);
				toggle(d);
			}
		}

		toggleAll(node);
	};

	// =======================================================================

	function expandAll(node) {
		function toggleAll(d) {
			if (d && d._children) {
				d._children.forEach(toggleAll);
				toggle(d);
			}
		}

		toggleAll(node);
	};

	/***************************************************************************/
  /***************************************************************************/
  /***************************************************************************/

	function DTree(o, fn) {
		this.o = o
		this.fn = fn
		this.layers = {};
		init.apply(this, arguments);
	};

	function init(o, fn) {
		if (document.all && !document.addEventListener) {
			throw { 
				name: 'Browser not supported',
				message: 'RevoTreeView is only compatible with Internet Explorer 9 and ' + 
				'above. If you are using Internet Explorer 9 then you must be in ' + 
				'Standards Mode. We recommend you use Google Chrome for the best ' +
				'User Experience.',
				toString: function() { return this.name + ": " + this.message } 
			} 
		}

		var self = this;
		$('#layers-dropdown input').each(function() {
			var layer = $(this);
			layer.prop('checked', true).prop('disabled', false);
			layer.val('');
			self.layers[layer.data('layer')] = { node: layer, id: layer.data('layer') };
		});
				
		loadDataset(o);
		this.bindUI();
	};

	DTree.prototype = {

		bindUI: function() {
			var self = this, layers = this.layers;

			layers.border.node.prop('checked', false);
			layers.legcolor.node.prop('checked', true);

			$('#layers-dropdown').on('click', function(e) {
				e.stopPropagation();

				switch ($(e.target).data('layer')) {
					case 'label' : // labels
						self.toggleLabels();
						break;

					case 'border' : // Borders
						self.toggleBorders()
						break;

					case 'color' : // Color
						self.toggleColor();
						break;

					case 'legcolor' : // Legend Color
						if (!visibility.legend) {
							self.toggleLegendMode('legend', 'path');
						}
						break;

					case 'path' : // Legend Pred Path
						if (!visibility.path) {
							self.toggleLegendMode('path', 'legend');
						}
						break;

					case 'legend' : // Legend Area
						self.toggleLegendArea();
						break;
				};
			});

			// -- Node Label Length --
			layers.truncate.node.on('keyup', function(e) {
				visibility.labelLength = parseInt(this.value, 10);
				if (this.upInterval) clearTimeout(this.upInterval);
				this.upInterval = setTimeout(function() {
					self.truncateLabel();
				}, 500);
			});

			// -- Redraw tree on window resize --

			var treeEl = $('#_tree');
			$(window).on('resize', function() {
				resize(treeEl);
			}).trigger('resize');

		},

		truncateLabel: function() {
			var len = visibility.labelLength;

			container.selectAll('.tree-label')[0].forEach(function(item, i) {
				item.textContent = item.innerHTML = trim(item.getAttribute('text-orig'), len);
			});
		},

		toggleLabels: function() {
			visibility.labels = !visibility.labels;
			container.selectAll(".tree-label").classed('hide', !visibility.labels);
		},
		
		toggleBorders: function() {
			visibility.borders = !visibility.borders;

			container.selectAll(".tree-node").style("stroke-width", function(d) {
				return strokeWidth(d);
			});
		},

		toggleColor: function() {
			var self = this,
			    layers = this.layers;

			visibility.colors = !visibility.colors;
			predictionPath(root);

			container.selectAll(".tree-node").style("fill", function(d) {
				var lmode = layers.legcolor.node;
				lmode.prop('disabled', !visibility.colors);

				// legend is checked then uncheck and choose path
				if (lmode.prop('checked') && !visibility.colors) {
					layers.path.node.prop('checked', true);
					self.toggleLegendMode('path', 'legend');
				} else if (lmode.prop('checked') && visibility.colors) {
					d3.select("#legend").classed('hide', false);
				}

				return fill(d);
			});
		},

		toggleLegendMode: function(to, from) {
			visibility[to] = !visibility[to];
			visibility[from] = !visibility[to];

			d3.select('#legend').classed('hide', !visibility.legend);
			d3.select('#path').classed('hide', !visibility.path);
		},

		toggleLegendArea: function() {
			var layers = this.layers;
			layers.legcolor.node.prop('disabled', visibility.area);
			layers.path.node.prop('disabled', visibility.area);
			
			if (!visibility.colors) {			
				layers.legcolor.node.prop('disabled', true);
			}

			d3.select('#legend-container').classed('hide', visibility.area);
			visibility.area = !visibility.area;

			resize();
		},

		destroy: function() {}

	};
	
	function dtree(o, fn) {
		return new DTree(o, fn)
	};

	return dtree;
});