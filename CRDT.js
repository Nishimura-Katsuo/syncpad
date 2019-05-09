'use strict';
// A simple, but more comprehensive indexed CRDT implementation
// I left out the string specific calls, since it doesn't take
// much effort to map or join the data into strings

/* global performance */
/* eslint-sourceType:"module" */

const nIndex = {
	value: 0,
	position: 1,
	lamport: 2,
	delete: 3,
};

class OrderedArray extends Array {
	search (value) {
		let limit = 30, start = 0, end = this.length - 1, mid, comp = this.compareFunc(value, this[end]);

		if (comp > 0) {
			return end + 1;
		}

		while (start < end && limit--) {
			mid = (start + end) >> 1;
			comp = this.compareFunc(value, this[mid]);

			if (comp <= 0) {
				end = mid;
			} else if (comp >= 0) {
				start = mid + 1;
			}
		}

		return start;
	}

	compareFunc (a, b) { // compatible with numbers, strings
		return a < b ? -1 : a > b ? 1 : 0;
	}
}

class NodeArray extends OrderedArray {
	mergeNode (node) {
		if (!node) {
			return undefined;
		}

		if (!this.length) {
			if (!node[nIndex.delete]) {
				this.push(node);

				return [0, 0, [node[nIndex.value]]];
			}
		} else {
			let pos = this.search(node), comp = this[pos] ? this.compareFunc(this[pos], node) : -1;

			if (comp) {
				if (!node[nIndex.delete]) {
					this.splice(pos, 0, node);

					return [pos, pos, [node[nIndex.value]]];
				}
			} else {
				if (node[nIndex.delete]) {
					node[nIndex.value] = this[pos][nIndex.value];
					this.splice(pos, 1);

					return [pos, pos + 1, []];
				}
			}
		}

		return undefined;
	}

	deleteIndex (index, site, lamport) {
		if (index < 0 || index >= this.length) {
			return undefined;
		}

		let ret = this[index];
		this.splice(index, 1);
		ret[nIndex.delete] = [site, lamport];

		return ret;
	}

	insertIndex (index, value, site, lamport) {
		if (index < 0 || index > this.length) {
			return undefined;
		}

		let newnode = [];

		this.splice(index, 0, newnode);

		let newindex = [], c = 0, p = this[index - 1] ? this[index - 1][nIndex.position] : [], n = this[index + 1] ? this[index + 1][nIndex.position] : [];

		newnode[nIndex.value] = value;
		newnode[nIndex.lamport] = lamport;
		newnode[nIndex.position] = newindex;

		while (true) {
			if (p[c] === undefined) {
				if (n[c] === undefined) {
					newindex.push(0, site);
				} else {
					newindex.push(n[c] - 1, site);
				}

				return newnode;
			} else {
				if (n[c] === undefined || p[c] + 1 < n[c]) {
					newindex.push(p[c] + 1, site);

					return newnode;
				}

			}

			newindex.push(p[c], p[c + 1]);
			c += 2;
		}
	}

	compareFunc (a, b) {
		let c = 0, av, bv;

		while (true) {
			av = a[nIndex.position][c], bv = b[nIndex.position][c];

			if (av === undefined) {
				if (bv === undefined) {
					return a[nIndex.lamport] - b[nIndex.lamport]; // if lamports are the same then it's the same node, don't care about value
				}

				return -1;
			} else {
				if (bv === undefined) {
					return 1;
				}

				if (av !== bv) {
					return av - bv;
				}
			}

			c++;
		}
	}
}

class TombstoneArray extends OrderedArray {
	mergeTombstone (tombstone) {
		if (tombstone && tombstone[nIndex.delete]) {
			if (this.length) {
				let pos = this.search(tombstone), comp = this[pos] ? this.compareFunc(this[pos], tombstone) : -1;

				if (comp) {
					this.splice(pos, 0, tombstone);
				}
			} else {
				this.push(tombstone);
			}
		}

		return tombstone;
	}

	compareFunc (a, b) {
		return (a[nIndex.lamport] - b[nIndex.lamport]) || (a[nIndex.position][a[nIndex.position].length - 1] - b[nIndex.position][b[nIndex.position].length - 1]);
	}
}

class VectorClocks {
	constructor () {
		this.clocks = {};
		this.pools = {};
	}

	advance (site, lamport) {
		if ((typeof site === 'string' || typeof site === 'number') && lamport >= 0) {
			this.clocks[site] = this.clocks[site] || 0;
			this.pools[site] = this.pools[site] || new Set();

			if (lamport === this.clocks[site] + 1) {
				++this.clocks[site];

				while (this.pools[site].has(this.clocks[site] + 1)) {
					this.pools[site].delete(++this.clocks[site]);
				}
			} else if (lamport > this.clocks[site] + 1) {
				this.pools[site].add(lamport);
			}
		}

		return true;
	}
}

export class IndexedCRDT {
	constructor (site) {
		this.nodes = new NodeArray();
		this.tombstones = new TombstoneArray();
		this.vectorClock = new VectorClocks();
		this.site = site;
		this.lamport = 1;
	}

	updateVectorClock (node) {
		let pos = node[nIndex.position];
		this.vectorClock.advance(pos[pos.length - 1], node[nIndex.lamport]);

		if (node[nIndex.delete]) {
			this.vectorClock.advance(...node[nIndex.delete]);
		}

		return node;
	}

	insert (index, value) {
		let ret = this.nodes.insertIndex(index, value, this.site, this.lamport);
		ret && this.updateVectorClock(ret) && this.lamport++;

		return ret.slice();
	}

	delete (index) {
		let ret = this.nodes.deleteIndex(index, this.site, this.lamport++);
		ret && this.updateVectorClock(ret) && this.lamport++;
		ret = this.tombstones.mergeTombstone(ret);

		return ret && ret.slice() || undefined;
	}

	value (index) {
		if (index < 0 || index >= this.nodes.length) {
			return this.nodes[index][nIndex.value];
		}
	}

	get length () {
		return this.nodes.length;
	}

	mergeNodes (nodes) {
		let inserts = [], deletes = [];
		nodes.forEach(node => this.updateVectorClock(node)[nIndex.delete] ? deletes.push(node) : inserts.push(node));
		let timeA = performance.now();
		inserts = inserts.sort((a, b) => this.nodes.compareFunc(b, a)).map(node => this.tombstones.mergeTombstone(node)).map(node => this.nodes.mergeNode(node)).filter(Boolean).reverse();
		let timeB = performance.now();
		deletes = deletes.sort((a, b) => this.nodes.compareFunc(b, a)).map(node => this.tombstones.mergeTombstone(node)).map(node => this.nodes.mergeNode(node)).filter(Boolean).reverse();
		let timeC = performance.now();

		let mInserts = [], mDeletes = [], cur;

		inserts.forEach(ins => {
			if (cur && cur[0] === ins[0]) {
				cur[2].push(...ins[2]);
			} else {
				mInserts.push(cur = ins);
			}
		});

		cur = undefined;
		deletes.forEach(del => {
			if (cur && cur[1] === del[0]) {
				cur[1] = del[1];
			} else {
				mDeletes.push(cur = del);
			}
		});

		let timeD = performance.now();

		console.log("Inserts merged in ", timeB - timeA, "ms");
		console.log("Deletes merged in ", timeC - timeB, "ms");
		console.log("Deltas merged in ", timeD - timeC, "ms");

		return [mInserts, mDeletes];
	}
}

export default IndexedCRDT
