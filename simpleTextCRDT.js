'use strict';
/* global module */

class simpleTextCRDT {
	constructor (site = 0) {
		this.site = site;
		this.lamport = 1;
		this.nodes = [];
		this.useTombstones = true;
		this.tombstones = {};
	}

	addNode (value, index) {
		let newindex = [];
		let ret = {value: value, site: this.site, lamport: this.lamport++, index: newindex};

		if (this.nodes.length < 1) {
			newindex.push([0, this.site]);
			this.nodes.push(ret);

			return ret;
		} else if (index <= 0) {
			newindex[0] = [this.nodes[0].index[0][0] - 1, this.site];
			this.nodes.unshift(ret);

			return ret;
		} else if (index >= this.nodes.length) {
			newindex[0] = [this.nodes[this.nodes.length - 1].index[0][0] + 1, this.site];
			this.nodes.push(ret);

			return ret;
		} else {
			let i = 0, a = this.nodes[index - 1].index, b = this.nodes[index].index, n = [0, this.site];
			this.nodes.splice(index, 0, ret);

			for (; i < a.length; i++) {
				n[0] = a[i][0] + 1;

				if (b[i] === undefined || this._compareIndexElement(n, b[i]) < 0) {
					newindex.push(n);

					return ret;
				} else {
					newindex.push(a[i].slice());
				}
			}

			if (b[i] === undefined) {
				n[0] = 0;
			} else {
				n[0] = b[i][0] - 1;
			}

			newindex.push(n);

			return ret;
		}
	}

	deleteNode (index) {
		if (index < 0 || index >= this.nodes.length) {
			return undefined;
		}

		let node = this.nodes.splice(index, 1)[0];

		if (this.useTombstones) {
			this.tombstones[node.site] = this.tombstones[node.site] || {};
			this.tombstones[node.site][node.lamport] = 1;
		}

		node.value = '';

		return node;
	}

	mergeNode (node) {
		if (!node || this.tombstones[node.site] && this.tombstones[node.site][node.lamport]) {
			return undefined;
		}

		if (!node.index) {
			throw new Error('undefined index: ' + JSON.stringify(node));
		}

		let i = 0, min = 0, max = this.nodes.length - 1, c;

		if (this.nodes.length) {
			while (min < max - 1) {
				i = (min + max) >> 1;

				if (i >= this.nodes.length) {
					throw new Error('index above bound!');
				}

				c = this._compareIndex(node.index, this.nodes[i].index);

				if (c <= 0) {
					max = i;
				}

				if (c >= 0) {
					min = i;
				}
			}


			for (i = min; i <= max; i++) {
				c = this._compareIndex(node.index, this.nodes[i].index);

				if (c <= 0) {
					break;
				}
			}
		}

		if (!node.value && this.useTombstones) {
			this.tombstones[node.site] = this.tombstones[node.site] || {};
			this.tombstones[node.site][node.lamport] = 1;
		}

		if (i >= this.nodes.length) {
			this.nodes.push(node);

			return [this.nodes.length, this.nodes.length, node.value];
		}

		if (node.site === this.nodes[i].site && node.lamport === this.nodes[i].lamport) {
			if (!node.value) {
				this.nodes.splice(i, 1);

				return [i, i + 1, ''];
			}
		} else {
			if (this.nodes[i].value) {
				this.nodes.splice(i, 0, node);

				return [i, i, node.value];
			}
		}

		return undefined;
	}

	mergeNodes (nodes) {
		if (!nodes) {
			return [];
		}

		return this._mergeEdits(nodes.map(this.mergeNode.bind(this)));
	}

	_mergeEdits (edits) {
		edits = edits.filter(Boolean).sort((a, b) => a[0] - b[0]);
		let deletes = edits.filter(edit => !edit[2]).sort((a, b) => a[0] - b[0]);
		let inserts = edits.filter(edit => edit[2]).sort((a, b) => a[0] - b[0]);
		edits = [];

		if (deletes.length) {
			let cur = deletes[0];
			edits.push(cur);

			for (let c = 1; c < deletes.length; c++) {
				if (cur[0] === deletes[c][0]) {
					cur[1] += deletes[c][1] - deletes[c][0];
				} else {
					cur = deletes[c];
					edits.push(cur);
				}
			}
		}

		if (inserts.length) {
			let cur = inserts[0];
			edits.push(cur);

			for (let c = 1; c < inserts.length; c++) {
				if (cur[0] + cur[2].length === inserts[c][0]) {
					cur[2] += inserts[c][2];
				} else {
					cur = inserts[c];
					edits.push(cur);
				}
			}
		}

		return edits;
	}


	_compareIndexElement (a, b) {
		if (a === b) {
			return 0;
		}

		if (a === undefined) {
			return -1;
		}

		if (b === undefined) {
			return 1;
		}

		let ret = a[0] - b[0];

		return ret ? ret : a[1] - b[1];
	}

	_compareIndex (a, b) {
		if (!a) {
			throw new Error('a undefined!');
		}

		if (!b) {
			throw new Error('b undefined!');
		}

		for (let i = 0, ret = 0, max = Math.max(a.length, b.length); i < max; i++) {
			if ((ret = this._compareIndexElement(a[i], b[i]))) {
				return ret;
			}
		}

		return 0;
	}

}

try {
	module.exports.simpleTextCRDT = simpleTextCRDT;
} catch (err) {
	// fail silently
}
