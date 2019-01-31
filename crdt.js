"use strict";
// Text CRDT implementation - light versioning, no join semilattice, no rewinds
//	Each letter typed is a unique event, so only insert/remove operations need be supported

/* global setTimeout */

let nodeCompare = (a, b) => {
	let i = 1;

	while (i < a.length && a[i] === b[i]) {
		i++;
	}

	return a[i] === undefined ? (b[i] === undefined ? 0 : -1) : (b[i] === undefined ? 1 : a[i] - b[i]);
};

/**
 * Map of nodes:
 * 	[0] = char code
 * 	[1, 2, 3, etc] = complex index [index, site, subindex, site, etc]
 */

function textCRDT () {
	this.nodes = [];
	this.site = 0;

	// assumed in-order delivery (because of relay service, perhaps)
	// if in-order delivery cannot be guaranteed set this to -1
	// or a safe time window in which out-of-order can be accurate
	this.discard = 0; // time in ms
}

textCRDT.prototype.discardNodes = function (removeNodes) {
	if (this.discard >= 0 && removeNodes && removeNodes.length) {
		setTimeout(() => this.nodes = this.nodes.filter(node => !removeNodes.includes(node)), this.discard);
	}
};

textCRDT.prototype.value = function () {
	return this.nodes.map(node => node[0] >= 0 ? String.fromCharCode(node[0]) : '').join('');
};

textCRDT.prototype.calcNode = function (index, value = -1) {
	if (this.nodes.length < 1) {
		return [value, 1, this.site];
	}

	if (index < 1) {
		return [value, this.nodes[0][1] - 1, this.site];
	}

	if (index >= this.nodes.length) {
		return [value, this.nodes[this.nodes.length - 1][1] + 1, this.site];
	}

	let newnode = [value], depth = 1;

	while (this.nodes[index - 1][depth] === this.nodes[index][depth] && this.nodes[index - 1][depth] !== undefined) {
		newnode.push(this.nodes[index - 1][depth], this.nodes[index - 1][depth + 1]);
		depth += 2;
	}

	if (this.nodes[index - 1][depth] === undefined) {
		newnode.push(this.nodes[index][depth] - 1, this.site);
	} else if (this.nodes[index - 1][depth] + 1 < this.nodes[index][depth]) {
		newnode.push(this.nodes[index - 1][depth] + 1, this.site);
	} else {
		newnode.push(this.nodes[index - 1][depth], this.nodes[index - 1][depth + 1]);
		depth += 2;
		newnode.push((this.nodes[index - 1][depth] | 0) + 1, this.site);
	}

	return newnode;
};

textCRDT.prototype.generateNodes = function (text2) {
	let i1min = 0, i1max = this.nodes.length, i2min = 0, i2max = text2.length;

	while (i1max > i1min && this.nodes[i1max - 1][0] < 0) { // minimize end
		i1max--;
	}

	while (i1max > i1min && i2max > i2min && this.nodes[i1max - 1][0] === text2.charCodeAt(i2max - 1)) {
		i1max--, i2max--;

		while (i1max > i1min && this.nodes[i1max - 1][0] < 0) {
			i1max--;
		}
	}

	while (i1max > i1min && this.nodes[i1min][0] < 0) { // minimize beginning
		i1min++;
	}

	while (i1max > i1min && i2max > i2min && this.nodes[i1min][0] === text2.charCodeAt(i2min)) {
		i1min++, i2min++;

		while (i1max > i1min && this.nodes[i1min][0] < 0) {
			i1min++;
		}
	}

	let text1 = [], height = i2max - i2min;

	for (let c = i1min; c < i1max; c++) { // ignore tombstones by building list of valid indexes
		if (this.nodes[c][0] >= 0) {
			text1.push(c);
		}
	}

	let width = text1.length, lcslen = Array(width + 1);
	text1.push(i1max); // for insertions off the deep end
	lcslen[width] = new Int32Array(height + 1);

	for (let x = width - 1; x >= 0; x--) { // build the lcs graph
		lcslen[x] = new Int32Array(height + 1);

		for (let y = height - 1; y >= 0; y--) {
			lcslen[x][y] = this.nodes[text1[x]][0] === text2.charCodeAt(i2min + y) ? lcslen[x + 1][y + 1] + 1 : Math.max(lcslen[x + 1][y], lcslen[x][y + 1]);
		}
	}

	let x = 0, y = 0, shift = 0, ret = [];

	if (this.debugmode) {
		console.log("lcs map area: " + (lcslen.length * lcslen[0].length));
	}

	let discardThese = [];

	do { // traverse lcs graph for deltas
		while (x < width && lcslen[x][y] === lcslen[x + 1][y]) {
			this.nodes[text1[x] + shift][0] = -1;
			discardThese.push(this.nodes[text1[x] + shift]);
			ret.push(this.nodes[text1[x] + shift].slice());
			x++;
		}

		while (y < height && lcslen[x][y] === lcslen[x][y + 1]) {
			ret.push(this.calcNode(text1[x] + shift, text2.charCodeAt(i2min + y)));
			this.nodes.splice(text1[x] + shift, 0, ret[ret.length - 1].slice());
			shift++;
			y++;
		}

		x = Math.min(x + 1, width);
		y = Math.min(y + 1, height);
	} while (x < width || y < height);

	this.discardNodes(discardThese);

	return ret;
};

class IndexExists extends Error {}

textCRDT.prototype.mergeNodes = function (nodes) {
	let discardThese = [];
	nodes.forEach(node => {
		let lower = 0, upper = this.nodes.length - 1, index = 0, order = 0;

		try {
			if (this.nodes.length) {

				order = nodeCompare(node, this.nodes[lower]);

				if (!order) {
					index = lower;
					throw new IndexExists();
				}

				if (order < 0) {
					this.nodes.unshift(node);

					if (node[0] < 0) {
						discardThese.push(node);
					}

					return;
				}

				order = nodeCompare(this.nodes[upper], node);

				if (!order) {
					index = upper;
					throw new IndexExists();
				}

				if (order < 0) {
					this.nodes.push(node);

					if (node[0] < 0) {
						discardThese.push(node);
					}

					return;
				}

				while (lower < upper - 1) {
					index = (lower + upper) >> 1;
					order = nodeCompare(this.nodes[index], node);

					if (!order) {
						throw new IndexExists();
					}

					if (order < 0) {
						lower = index;
					} else {
						upper = index;
					}
				}

				this.nodes.splice(upper, 0, node);

				if (node[0] < 0) {
					discardThese.push(node);
				}
			} else {
				this.nodes.push(node);

				if (node[0] < 0) {
					discardThese.push(node);
				}
			}
		} catch (e) {
			if (e instanceof IndexExists) {
				this.nodes[index][0] = Math.min(this.nodes[index][0], node[0]);

				if (this.nodes[index][0] < 0) {
					discardThese.push(this.nodes[index]);
				}
			} else {
				throw e;
			}
		}
	});

	this.discardNodes(discardThese);

	return this;
};

/* globals module */

if (typeof module !== 'undefined') {
	module.exports = textCRDT;
}
