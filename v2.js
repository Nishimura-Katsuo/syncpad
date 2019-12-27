// monaco events etc...
// edit event: editor.onDidChangeModelContent(e => stuff);
// offset calc: model.getOffsetAt({ lineNumber: 2, column: 13 });
// position calc: model.getPositionAt(offset);
// range calc: model._getRangeAt(offseta, offsetb, text);

// monaco loaded without 'require' because I was getting duplicate definition warnings
// see index.html for the load process

let windowLoaded = new Promise(resolve => window.addEventListener('load', resolve)), $ = document.getElementById.bind(document), pad, chatInput, fileInput, fileReader = new FileReader(), fileDownload, hash = window.location.hash.slice(1).split('#');

import IndexedCRDT from './CRDT.js';
import Theme from './v2-themes.js';
import monacoLoaded from './monaco-module.js'; /* globals monaco */
import vueLoaded from './vue-module.js'; /* globals Vue */
import cookies from './cookies.js';
import Languages from './languageSupport.js';
import Eval from './remoteEval.js';

function escapeHTML (str) {
	str = str.replace(/"/g, '&quot;');
	str = str.replace(/'/g, '&#39;');
	str = str.replace(/</g, '&lt;');
	str = str.replace(/>/g, '&gt;');

	let i = str.indexOf('&');

	while (i >= 0) {
		if (str.slice(i, i + 6) !== '&quot;' && str.slice(i, i + 5) !== '&#39;' && str.slice(i, i + 4) !== '&lt;' && str.slice(i, i + 4) !== '&gt;' && str.slice(i, i + 5) !== '&amp;') {
			str = str.slice(0, i) + '&amp;' + str.slice(i + 1);
		}

		i = str.indexOf('&', i + 1);
	}

	return str;
}

String.prototype.escapeHTML = function () {
	return escapeHTML(this);
};

function updateHash (newhash = hash) {
	hash = newhash;
	let ret = '';

	for (let c = 0; c < hash.length; c++) {
		if (hash[c] === undefined || hash[c] === null || hash[c] === '') {
			break;
		}

		ret += '#' + hash[c];
	}

	window.location.hash = ret;
}

function setTheme (theme) {
	monaco.editor.setTheme(theme);
	document.body.className = 'cursor-theme-' + theme;
	$('mainmenu').className = 'menu menu-theme-' + theme;
	$('messages').className = 'messages messages-theme-' + theme;
	$('statusbar').className = 'statusbar statusbar-theme-' + theme;

	for (let elem of $('themes-options').children) {
		elem.className = (elem.id === theme ? 'selected' : '');
	}

	cookies.v2theme = theme;
}

function setLanguage (lang) {
	monaco.editor.setModelLanguage(pad.model, lang);

	for (let elem of $('languages-options').children) {
		elem.className = (elem.id === lang ? 'selected' : '');
	}

	hash[1] = lang;
	updateHash();
}

// let wrapRegEx = /.{1,80}/g;

function showMessage (msg, color) {
	let elem = document.createElement('pre'), br = document.createElement('br');

	if (!msg) {
		return;
	}

	if (typeof msg !== 'string') {
		msg = msg.toString();
	}

	elem.innerText = msg; // .match(wrapRegEx).join('\n');
	elem.style.opacity = 1;

	if (color) {
		if (color[0] === '#') {
			elem.style.backgroundColor = color;
		} else {
			elem.className = color;
		}
	}

	$('messages').appendChild(elem);
	$('messages').appendChild(br);
	setTimeout(() => {
		elem.addEventListener('transitionend', () => {
			elem.remove();
			br.remove();
		});
		elem.style.opacity = 0;
	}, 10000);
}

Eval.setMessageFunc(showMessage);

let readyStates = ['Connecting', 'Connected', 'Disconnecting', 'Disconnected'];

function updateStatus () {
	if (pad && pad.ws) {
		let tmp = '';
		tmp += '[' + readyStates[pad.ws.readyState];

		if (pad.ws.readyState) {
			tmp += ' as ' + pad.username;
		}

		tmp += ']';

		if (pad.ws.readyState === 1) {
			tmp += ' Users: ' + Object.keys(pad.peers).map(site => pad.peers[site]).filter(peer => peer.connected).map(peer => peer.username).join(', ');
		}

		$('statusbar').innerText = tmp;
	}
}

class Syncpad {
	constructor (buffer) {
		this.buffer = buffer;
		this.ignoreEvents = false;
		this.element = document.createElement('div');
		this.element.classList.add('syncpad');
		document.body.insertBefore(this.element, $('statusbar'));

		this.editor = monaco.editor.create(this.element, {
			language: 'text',
			automaticLayout: true,
			fontFamily: 'Inconsolata',
			fontSize: 14.5,
			lineHeight: 15,
			minimap: {
				enabled: false,
			},
		});
		this.username = 'Guest';
		this.model = this.editor.getModel();
		this.changeQueue = [];
		this.peers = {};
		this.editor.onDidChangeModelContent(this._onChange.bind(this));
		this.editor.onDidChangeCursorSelection(this._onCursorChange.bind(this));
		this._connect();
	}

	setValue (text) {
		let start = performance.now();

		let tmp = monaco.editor.createModel(text || '');
		tmp.setEOL(0);
		this.model.setValueFromTextBuffer(tmp._buffer);

		if (text) {
			let cursor = this.editor.getSelection();
			cursor.endColumn = 1;
			cursor.endLineNumber = 1;
			cursor.positionColumn = 1;
			cursor.positionLineNumber = 1;
			cursor.selectionStartColumn = 1;
			cursor.selectionStartLineNumber = 1;
			cursor.startColumn = 1;
			cursor.startLineNumber = 1;
			this.editor.setSelection(cursor);
		}

		let diff = performance.now() - start;

		if (diff > 1) {
			console.log('setValue length: ' + diff.toFixed(3) + 'ms');
		}
	}

	_onChange (e) {
		if (this.ignoreEvents) {
			return;
		}

		e.changes.forEach(change => {
			if (change.rangeLength || change.text) {
				this.changeQueue.push(change);
			}
		});

		this._processChangeQueue();
	}

	_onCursorChange (e) {
		if (this._cursorTimeout) {
			clearTimeout(this._cursorTimeout);
		}

		this._cursorTimeout = setTimeout(() => {
			if (pad.ws && pad.ws.readyState === 1) {
				this._cursorTimeout = 0;
				this._doCursorChange(e.selection);
			} else {
				this._onCursorChange(e);
			}
		}, 10);
	}

	_doCursorChange (selection) {
		this.ws.send(JSON.stringify({cursor: selection}));
	}

	_processChangeQueue () {
		if (this.changeQueue && this.changeQueue.length && this.crdt && this.ws.readyState === 1) {
			let nodes = [];
			this.changeQueue.forEach(change => {
				for (let c = 0; c < change.rangeLength; c++) {
					nodes.push(this.crdt.delete(change.rangeOffset));
				}

				if (change.text.indexOf('\r') > -1) {
					showMessage('Invalid Line Endings not handled!', 'info');
				}

				for (let c = 0; c < change.text.length; c++) {
					nodes.push(this.crdt.insert(change.rangeOffset + c, change.text[c]));
				}
			});
			this.changeQueue = [];
			this.ws.send(JSON.stringify({nodes: nodes}));
		}
	}

	_onMessage (data) {
		if (!data || !data.data) {
			return;
		}

		data = JSON.parse(data.data);
		let needsStatusUpdate = false;

		if (data.site) {
			this.site = data.site;
		}

		if (data.new || !this.crdt) {
			this.ignoreEvents = true;
			this.crdt = new IndexedCRDT(data.site);
			this.changeQueue = [];
			this.setValue('');

			for (let site in this.peers) {
				this._hideCursor(site);
			}

			this.ignoreEvents = false;
		}

		if (data.username) {
			this.username = cookies.username = data.username;
			needsStatusUpdate = true;
		}

		if (data.buffer) {
			if (this.buffer !== data.buffer) {
				let old = this.buffer;
				this.buffer = data.buffer;
				this.bufferChange && this.bufferChange(this.buffer, old);
			}
		}

		if (data.nodes) {
			if (typeof data.nodes === 'string') {
				if (data.nodes.charAt(data.nodes.length - 1) === ',') {
					data.nodes = data.nodes.slice(0, -1);
				}

				data.nodes = JSON.parse(`[${data.nodes}]`).flat(1);
			}

			let edits = this.crdt.mergeNodes(data.nodes);
			this.ignoreEvents = true;
			let cursor = this.editor.getSelection();
			let noselect = (cursor.startColumn === cursor.endColumn && cursor.startLineNumber === cursor.endLineNumber);
			edits.forEach(deltas => {
				this.editor.executeEdits('', deltas.map(edit => ({range: this.model._getRangeAt(edit[0], edit[1]), text: edit[2].join('')})));
			});

			if (noselect) {
				cursor = this.editor.getSelection();
				this.editor.setSelection(new monaco.Selection(cursor.positionLineNumber, cursor.positionColumn, cursor.positionLineNumber, cursor.positionColumn));
			}

			this.ignoreEvents = false;
		}

		if (data.chat) {
			showMessage(data.chatter + ': ' + data.chat, 'chat');
		}

		if (data.requestLength !== undefined) {
			data.requestLength /= 1e6;

			if (data.requestLength > 1) {
				console.log('requestLength: ' + data.requestLength + 'ms');
			}
		}

		if (data.connect) {
			if (typeof data.connect === 'number') {
				data.connect = [data.connect];
			}

			if (data.connect.length) {
				data.connect.forEach(site => {
					this._guaranteePeer(site).connected = true;
				});
			}

			needsStatusUpdate = true;
		}

		if (data.disconnect) {
			this._guaranteePeer(data.disconnect).connected = false;
			this._hideCursor(data.disconnect);

			needsStatusUpdate = true;
		}

		if (data.usernames) {
			for (let site in data.usernames) {
				this._guaranteePeer(site).username = data.usernames[site];
			}

			needsStatusUpdate = true;
		}

		if (data.cursor) {
			this._showCursor(data.cursor.site, data.cursor.position);
		}

		if (data.ping) {
			console.log('Server ping at ' + Date.now());
		}

		if (data.initialize) {
			this.editor.executeEdits('', [{range: this.model._getRangeAt(0, 0), text: '// type some code!!!\n'}]);
			this.editor.setSelection(new monaco.Selection(2, 1, 2, 1));
		}

		this._processChangeQueue();

		if (needsStatusUpdate) {
			updateStatus();
		}
	}

	_connect () {
		if (this.ws) {
			this.ws.onopen = this.ws.onmessage = this.ws.onclose = null;
			this.ws.close();
		}

		this.ws = new WebSocket('wss://' + window.location.hostname + window.location.pathname + 'api/relay');
		this.ws.onopen = this._connected.bind(this);
		this.ws.onmessage = this._onMessage.bind(this);
		this.ws.onclose = this._connect.bind(this);
		updateStatus();
	}

	_connected () {
		this.ws.send(JSON.stringify({
			buffer: this.buffer,
			username: cookies.username,
		}));

		if (!this.pingInterval) {
			this.pingInterval = setInterval(this._ping.bind(this), 30000);
			console.log('Ping interval: ' + this.pingInterval);
		}

		updateStatus();
	}

	_ping () {
		if (this.ws && this.ws.readyState === 1) {
			this.ws.send(JSON.stringify({ping: true}));
		}
	}

	_guaranteePeer (site) {
		return this.peers[site] = (this.peers[site] || this._defaultPeer());
	}

	_showCursor (site, {startLineNumber, startColumn, endLineNumber, endColumn}) {
		if (this.peers[site]) {
			let cursorClass;

			if (startLineNumber === endLineNumber && startColumn === endColumn) {
				cursorClass = 'remote-cursor';
			} else {
				cursorClass = 'remote-selection';
			}

			this.peers[site].cursor = this.editor.deltaDecorations(this.peers[site].cursor, [{
				range: new monaco.Range(startLineNumber, startColumn, endLineNumber, endColumn),
				options: {
					className: cursorClass,
				},
			}]);
		}
	}

	_hideCursor (site) {
		if (this.peers[site] && this.peers[site].cursor.length) {
			this.peers[site].cursor = this.editor.deltaDecorations(this.peers[site].cursor, []);
		}
	}

	_defaultPeer () {
		return {connected: false, username: 'Anonymous', cursor: []};
	}
}

(async function () {
	await windowLoaded;
	await monacoLoaded;
	await vueLoaded;

	if (!cookies.v2theme) {
		cookies.v2theme = 'vs-dark';
	}

	if (!cookies.username) {
		cookies.username = 'Guest';
	}

	if (!hash[1]) {
		hash[1] = 'javascript';
	}

	chatInput = $('chat');
	fileInput = document.createElement('input');
	fileInput.type = 'file';
	fileInput.style.display = 'none';
	document.body.appendChild(fileInput);

	fileReader.onload = () => {
		pad.setValue(fileReader.result);
	};

	fileInput.onchange = () => {
		if (fileInput.files.length) {
			fileReader.readAsText(fileInput.files[0]);
			fileInput.value = '';
		}
	};

	fileDownload = document.createElement('a');
	fileDownload.style.display = 'none';
	document.body.appendChild(fileDownload);

	chatInput.addEventListener('keydown', e => {
		if (e.keyCode === 13 && pad.ws && pad.ws.readyState === 1 && chatInput.value) {
			pad.ws.send(JSON.stringify({chat: chatInput.value}));
			chatInput.value = '';
		}
	});

	pad = new Syncpad(hash[0]);
	pad.editor.focus();

	for (let ct in Theme.custom) {
		monaco.editor.defineTheme(ct, Theme.custom[ct]);
	}

	new Vue({
		el: '#mainmenu',
		created: function () {
			let menuKey = 0;

			Vue.component('css-top-menu', {
				data: function () {
					return { menuKey: menuKey++ };
				},
				props: ['menudata'],
				computed: {
					onClick: function () {
						return this.menudata && this.menudata.onClick || (() => {});
					}
				},
				template: '<div v-if="menudata.children && menudata.children.length" :id="menudata.id"><div>{{menudata.title || menudata.name}}</div><div :id="menudata.id + \'-options\'"><css-menu v-for="child in menudata.children" :menudata="child" :key="menudata.menuKey" :parent="menudata"></css-menu></div></div><div v-else :id="menudata.id" @click="onClick"><div>{{menudata.title || menudata.name}}</div></div>'
			});

			Vue.component('css-menu', {
				data: function () {
					return { menuKey: menuKey++ };
				},
				props: ['menudata', 'parent'],
				computed: {
					onClick: function () {
						return this.menudata && this.menudata.onClick || this.parent && this.parent.onClick || (() => {});
					}
				},
				template: '<div v-if="menudata.children && menudata.children.length" :id="menudata.id"><div>{{menudata.title || menudata.name}}</div><div :id="menudata.id + \'-options\'"><css-menu v-for="child in menudata.children" :menudata="child" :key="menudata.menuKey" :parent="menudata"></css-menu></div></div><div v-else :id="menudata.id" @click="onClick">{{menudata.title || menudata.name}}</div>'
			});
		},
		data: {
			menus: [
				{id: 'file', title: 'File', children: [
					{id: 'new', title: 'New', onClick: () => window.location.hash = ''},
					{id: 'open', title: 'Open', onClick: () => fileInput.click()},
					{id: 'save', title: 'Save As...', onClick: () => {
						fileDownload.download = (Languages[hash[1]].fileName || '*').replace('*', hash[0]);
						fileDownload.href = URL.createObjectURL(new Blob([pad.model.getValue()], {type: 'application/octet-stream'}));
						fileDownload.click();
					}},
					{id: 'eval', title: 'Eval', onClick: () => Eval.remoteEval(pad.model.getValue(), hash[1])},
					{id: 'encode', title: 'Copy (HTML encoded)', onClick: () => {
						/* global hljs */
						navigator.clipboard.writeText(pad.model.getValue().escapeHTML());
						showMessage('Code encoded and copied to clipboard!', 'info');
					}},
					{id: 'highlight', title: 'Copy (highlight.js encoded)', onClick: () => {
						/* global hljs */
						navigator.clipboard.writeText('<pre>' + hljs.highlight(hash[1], pad.model.getValue(), true).value + '</pre>');
						showMessage('Code encoded and copied to clipboard!', 'info');
					}},
					{id: 'popout', title: 'Pop Out', onClick: () => window.open(window.location.href, '', 'resizable=yes,width=800,height=600')},
				]},
				{id: 'languages', title: 'Languages', children: Object.values(Languages), onClick: function (e) {
					setLanguage(e.target.id);
				}},
				{id: 'themes', title: 'Themes', children: Theme.themes, onClick: function (e) {
					setTheme(e.target.id);
				}},
				{id: 'nickname', title: 'Nickname', onClick: function () {
					let ret = prompt('Enter your username:', cookies.username);

					if (ret) {
						cookies.username = ret;

						if (pad.ws && pad.ws.readyState === 1) {
							pad.ws.send(JSON.stringify({username: cookies.username}));
						}
					}
				}},
			],
		},
		mounted: function () {
			setLanguage(hash[1]);
			setTheme(cookies.v2theme);

			window.addEventListener('keydown', e => {
				if (e.ctrlKey) {
					switch (e.keyCode) {
					case 83: // s
						e.preventDefault();
						$('save').click();
						break;
					case 79: // o
						e.preventDefault();
						$('open').click();
						break;
					case 69: // e
						e.preventDefault();
						$('eval').click();
						break;
					default:
						break;
					}
				}
			});
		}
	});

	pad.bufferChange = buffer => {
		hash[0] = buffer;
		updateHash();
	};

	window.onhashchange = () => {
		let newhash = window.location.hash.slice(1).split('#');
		newhash[1] = newhash[1] || hash[1];

		if (newhash[1] !== hash[1]) {
			setLanguage(newhash[1]);
		}

		if (newhash[0] !== hash[0]) {
			updateHash(newhash);
			window.location.reload();
		} else {
			hash = newhash;
		}
	};

	$('loading').style.display = 'none';
})();
