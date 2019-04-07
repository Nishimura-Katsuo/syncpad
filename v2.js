"use strict";
/* globals monaco simpleTextCRDT WebSocket setTimeout clearTimeout prompt FileReader performance URL Blob themes */

// edit event: editor.onDidChangeModelContent(e => stuff);
// offset calc: model.getOffsetAt({ lineNumber: 2, column: 13 });
// position calc: model.getPositionAt(offset);
// range calc: model._getRangeAt(offseta, offsetb, text);

let $ = document.getElementById.bind(document);
let foreverDate = 'Thu, 18 Dec 4013 12:00:00 UTC';

let _cookies = {};
let cookies = new Proxy(_cookies, {
	get: (obj, prop) => {
		document.cookie
			.split(';')
			.map(cookie => cookie.trim().split('='))
			.forEach(ck => (obj[ck[0]] = ck[1]));

		return typeof obj[prop] !== 'undefined' ? JSON.parse(obj[prop]) : '';
	},
	set: (obj, prop, value) => {
		if (prop) {
			document.cookie = prop + '=' + JSON.stringify(value) + ';path=/;expires=' + foreverDate;
		}

		return true;
	},
});

let mainmenu, messages, pad, statusbar, chatInput, fileInput, fileReader = new FileReader(), fileDownload, evalws, hash = window.location.hash.slice(1).split('#');

let fileName = {
	azcli: '*.azcli',
	bat: '*.bat',
	c: '*.c',
	clojure: '*.clj',
	coffeescript: '*.coffee',
	cpp: '*.cpp',
	csharp: '*.cs',
	css: '*.css',
	dockerfile: 'Dockerfile',
	fsharp: '*.fs',
	go: '*.go',
	html: '*.html',
	java: '*.java',
	javascript: '*.js',
	json: '*.json',
	kotlin: '*.kt',
	lua: '*.lua',
	markdown: '*.md',
	mysql: '*.mysql',
	'objective-c': '*.m',
	perl: '*.pl',
	php: '*.php',
	pgsql: '*.pgsql',
	python: '*.py',
	r: '*.r',
	ruby: '*.rb',
	rust: '*.rs',
	shell: '*.sh',
	sql: '*.sql',
	swift: '*.swift',
	text: '*.txt',
	typescript: '*.ts',
	vb: '*.bas',
	xml: '*.xml',
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
	mainmenu.className = 'menu menu-theme-' + theme;
	messages.className = 'messages messages-theme-' + theme;
	statusbar.className = 'statusbar statusbar-theme-' + theme;

	for (let elem of $('themes').children) {
		elem.className = (elem.id === theme ? 'selected' : '');
	}

	cookies.v2theme = theme;
}

function setLanguage (lang) {
	monaco.editor.setModelLanguage(pad.model, lang);

	for (let elem of $('languages').children) {
		elem.className = (elem.id === lang ? 'selected' : '');
	}

	hash[1] = lang;
	updateHash();
}

function themeClick (e) {
	setTheme(e.target.id);
}

function languageClick (e) {
	setLanguage(e.target.id);
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

	messages.appendChild(elem);
	messages.appendChild(br);
	setTimeout(() => {
		elem.addEventListener('transitionend', () => {
			elem.remove();
			br.remove();
		});
		elem.style.opacity = 0;
	}, 10000);
}

let evalQueue = [];

function remoteEvalConnect () {
	if (!evalws || evalws.readyState > 1) {
		evalws = new WebSocket('wss://' + window.location.hostname + '/api/eval');
	}

	evalws.onclose = remoteEvalConnect;

	evalws.onmessage = e => {
		showMessage(e.data);
	};

	evalws.onopen = () => {
		evalQueue.forEach(text => evalws.send(text));
		evalQueue = [];
	};
}

function remoteEval () {
	let text = pad.model.getValue();

	if (!text) {
		return;
	}

	remoteEvalConnect();

	text = JSON.stringify({program: hash[1], data: text});

	if (evalws.readyState === 1) {
		evalws.send(text);
	} else {
		evalQueue.push(text);
	}
}

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

		statusbar.innerText = tmp;
	}
}

class Syncpad {
	constructor (buffer) {
		this.buffer = buffer;
		this.ignoreEvents = false;
		this.element = document.createElement('div');
		this.element.classList.add('syncpad');
		document.body.insertBefore(this.element, statusbar);

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
					nodes.push(this.crdt.deleteNode(change.rangeOffset));
				}

				if (change.text.indexOf('\r') > -1) {
					showMessage('Invalid Line Endings not handled!', 'info');
				}

				for (let c = 0; c < change.text.length; c++) {
					nodes.push(this.crdt.addNode(change.text[c], change.rangeOffset + c));
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
			this.crdt = new simpleTextCRDT(data.site);
			this.crdt.useTombstones = false;
			this.changeQueue = [];
			this.setValue('');

			for (let site in this.peers) {
				this._hideCursor(site);
			}
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

		if (data.tombstones) {
			this.crdt.tombstones = data.tombstones;
		}

		if (data.nodes) {
			let edits = this.crdt.mergeNodes(data.nodes);
			this.ignoreEvents = true;

			if (data.new) {
				this.setValue(this.crdt.nodes.map(node => node.value).join(''));
			} else {
				let cursor = this.editor.getSelection();
				let noselect = (cursor.startColumn === cursor.endColumn && cursor.startLineNumber === cursor.endLineNumber);
				edits.forEach(edit => {
					this.editor.executeEdits('', [{range: this.model._getRangeAt(edit[0], edit[1]), text: edit[2]}]);
				});

				if (noselect) {
					cursor = this.editor.getSelection();
					cursor.selectionStartColumn = cursor.endColumn = cursor.startColumn = cursor.positionColumn;
					cursor.selectionStartLineNumber = cursor.endLineNumber = cursor.startLineNumber = cursor.positionLineNumber;
					this.editor.setSelection(cursor);
				}
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

		this.ws = new WebSocket('wss://' + window.location.hostname + '/syncpad/api/relay');
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
		updateStatus();
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

window.addEventListener('load', () => {
	if (!cookies.v2theme) {
		cookies.v2theme = 'vs-dark';
	}

	if (!cookies.username) {
		cookies.username = 'Guest';
	}

	if (!hash[1]) {
		hash[1] = 'javascript';
	}

	mainmenu = $('mainmenu');
	messages = $('messages');
	statusbar = $('statusbar');

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

	monaco.editor.defineTheme('codeFingers', themes.codeFingers);
	monaco.editor.defineTheme('idleFingers', themes.idleFingers);

	pad = new Syncpad(hash[0]);
	pad.editor.focus();
	setLanguage(hash[1]);

	setTheme(cookies.v2theme);

	$('new').addEventListener('click', () => window.location.hash = '');
	$('open').addEventListener('click', () => fileInput.click());
	$('save').addEventListener('click', () => {
		fileDownload.download = (fileName[hash[1]] || '*').replace('*', hash[0]);
		fileDownload.href = URL.createObjectURL(new Blob([pad.model.getValue()], {type: 'application/octet-stream'}));
		fileDownload.click();
	});
	$('eval').addEventListener('click', remoteEval);
	$('popout').addEventListener('click', () => window.open(window.location.href, '', 'resizable=yes,width=800,height=600'));

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
			}
		}
	});

	for (let elem of $('themes').children) {
		elem.addEventListener('click', themeClick);
	}

	for (let elem of $('languages').children) {
		if (elem.id) {
			elem.addEventListener('click', languageClick);
		}
	}

	$('nickname').addEventListener('click', () => {
		let ret = prompt('Enter your username:', cookies.username);

		if (ret) {
			cookies.username = ret;

			if (pad.ws && pad.ws.readyState === 1) {
				pad.ws.send(JSON.stringify({username: cookies.username}));
			}
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
});
