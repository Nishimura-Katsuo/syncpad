/* global ace textCRDT WebSocket cookies setTimeout URL Blob FileReader prompt setInterval */
/* TODO:
 * 	magic cursors
 * 	saving to file
 * 	move cursor/selection on diff
 */

{
	let $ = document.getElementById.bind(document);
	let hash = window.location.hash.slice(1).split('#');
	let ws, buffername = encodeURI(hash[0]), crdt = new textCRDT(), editor, changing = false, chatbox;
	let currentMode = (hash[1] || "javascript"), selectFilter = "invert(100%)", menubar, fileinput, filereader = new FileReader();
	cookies.theme = cookies.theme || "idle_fingers";
	cookies.username = cookies.username || "Guest";

	let themes = {
		ambiance: {display: "Ambiance", theme: "ace/theme/ambiance"},
		chaos: {display: "Chaos", theme: "ace/theme/chaos"},
		chrome: {display: "Chrome", theme: "ace/theme/chrome"},
		clouds: {display: "Clouds", theme: "ace/theme/clouds"},
		clouds_midnight: {display: "Clouds (Midnight)", theme: "ace/theme/clouds_midnight"},
		cobalt: {display: "Cobalt", theme: "ace/theme/cobalt"},
		crimson_editor: {display: "Crimson Editor", theme: "ace/theme/crimson_editor"},
		dawn: {display: "Dawn", theme: "ace/theme/dawn"},
		dracula: {display: "Dracula", theme: "ace/theme/dracula"},
		dreamweaver: {display: "Dreamweaver", theme: "ace/theme/dreamweaver" },
		eclipse: {display: "Eclipse", theme: "ace/theme/eclipse"},
		github: {display: "Github", theme: "ace/theme/github"},
		gob: {display: "Green on Black", theme: "ace/theme/gob"},
		gruvbox: {display: "Gruvbox", theme: "ace/theme/gruvbox"},
		idle_fingers: {display: "idle Fingers", theme: "ace/theme/idle_fingers"},
		iplastic: {display: "IPlastic", theme: "ace/theme/iplastic"},
		katzenmilch: {display: "KatzenMilch", theme: "ace/theme/katzenmilch"},
		kr_theme: {display: "krTheme", theme: "ace/theme/kr_theme"},
		kuroir: {display: "Kuroir", theme: "ace/theme/kuroir"},
		merbivore: {display: "Merbivore", theme: "ace/theme/merbivore"},
		merbivore_soft: {display: "Merbivore (soft)", theme: "ace/theme/merbivore_soft"},
		mono_industrial: {display: "Mono Industrial", theme: "ace/theme/mono_industrial"},
		monokai: {display: "Monokai", theme: "ace/theme/monokai"},
		pastel_on_dark: {display: "Pastel on Dark", theme: "ace/theme/pastel_on_dark"},
		solarized_dark: {display: "Solarized Dark", theme: "ace/theme/solarized_dark"},
		solarized_light: {display: "Solarized Light", theme: "ace/theme/solarized_light"},
		sqlserver: {display: "SQL Server", theme: "ace/theme/sqlserver"},
		terminal: {display: "Terminal", theme: "ace/theme/terminal"},
		textmate: {display: "Textmate", theme: "ace/theme/textmate"},
		tomorrow: {display: "Tomorrow", theme: "ace/theme/tomorrow"},
		tomorrow_night: {display: "Tomorrow Night", theme: "ace/theme/tomorrow_night"},
		twilight: {display: "Twilight", theme: "ace/theme/twilight"},
		vibrant_ink: {display: "Vibrant Ink", theme: "ace/theme/vibrant_ink"},
		xcode: {display: "XCode", theme: "ace/theme/xcode"},
	};

	let languages = {
		"assembly": {display: "Assembly (x86)", mode: "ace/mode/assembly_x86", file: "*.s"},
		"c": {display: "C", mode: "ace/mode/c_cpp", file: "*.c"},
		"cpp": {display: "C++", mode: "ace/mode/c_cpp", file: "*.cpp"},
		"clojure": {display: "Clojure", mode: "ace/mode/clojure", file: "*.clj"},
		"coffeescript": {display: "Coffeescript", mode: "ace/mode/coffee", file: "*.coffee"},
		"csharp": {display: "C#", mode: "ace/mode/csharp", file: "*.cs"},
		"css": {display: "CSS", mode: "ace/mode/css", file: "*.css"},
		"docker": {display: "Docker", mode: "ace/mode/dockerfile", file: "Dockerfile"},
		"erlang": {display: "Erlang", mode: "ace/mode/erlang", file: "*.erl"},
		"gitignore": {display: ".gitignore", mode: "ace/mode/gitignore", file: ".gitignore"},
		"glsl": {display: "GL Shader", mode: "ace/mode/glsl", file: "*.glsl"},
		"go": {display: "Go", mode: "ace/mode/golang", file: "*.go"},
		"haskell": {display: "Haskell", mode: "ace/mode/haskell", file: "*.hs"},
		"html": {display: "HTML", mode: "ace/mode/html", file: "*.htm"},
		"ini": {display: "INI", mode: "ace/mode/ini", file: "*.ini"},
		"java": {display: "Java", mode: "ace/mode/java", file: "*.java"},
		"javascript": {display: "Javascript", mode: "ace/mode/javascript", file: "*.js"},
		"json": {display: "JSON", mode: "ace/mode/json", file: "*.json"},
		"lisp": {display: "Lisp", mode: "ace/mode/lisp", file: "*.lisp"},
		"lua": {display: "Lua", mode: "ace/mode/lua", file: "*.lua"},
		"make": {display: "Make", mode: "ace/mode/makefile", file: "Makefile"},
		"md": {display: "Markdown", mode: "ace/mode/markdown", file: "*.md"},
		"matlab": {display: "Matlab", mode: "ace/mode/matlab", file: "*.m"},
		"mysql": {display: "MySQL", mode: "ace/mode/mysql", file: "*.sql"},
		"objectivec": {display: "Objective C", mode: "ace/mode/objectivec", file: "*.m"},
		"php": {display: "PHP", mode: "ace/mode/php", file: "*.php"},
		"text": {display: "Plain Text", mode: "ace/mode/plain_text", file: "*.txt"},
		"python": {display: "Python", mode: "ace/mode/python", file: "*.py"},
		"ruby": {display: "Ruby", mode: "ace/mode/ruby", file: "*.rb"},
		"rust": {display: "Rust", mode: "ace/mode/rust", file: "*.rs"},
		"scala": {display: "Scala", mode: "ace/mode/scala", file: "*.scala"},
		"svg": {display: "SVG", mode: "ace/mode/svg", file: "*.svg"},
		"swift": {display: "Swift", mode: "ace/modeswift", file: "*.swift"},
		"typescript": {display: "Typescript", mode: "ace/mode/typescript", file: "*.ts"},
		"vbscript": {display: "VBScript", mode: "ace/mode/vbscript", file: "*.vbs"},
		"xml": {display: "XML", mode: "ace/mode/xml", file: "*.xml"},
	};

	function updateDisplay (newnodes) {
		let cursor = editor.getCursorPosition(), selection = editor.getSelectionRange();

		changing = true;

		if (newnodes) {
			editor.setValue(crdt.mergeNodes(newnodes).value());
		} else {
			editor.setValue(crdt.value());
		}

		changing = false;

		editor.moveCursorToPosition(cursor);
		editor.getSelection().setSelectionRange(selection);

		return true;
	}

	function processDiffs (newtext = editor.getValue()) {
		if (!ws || ws.readyState !== 1) {
			return;
		}

		if (changing) {
			return;
		}

		let p = crdt.generateNodes(newtext);

		if (p.length) {
			ws.send(JSON.stringify({nodes: p}));
		}

		return p;
	}

	function showChat (chatter, msg) {
		if (chatbox) {
			let newchat = document.createElement('span');
			newchat.innerText = chatter + ": " + msg;
			newchat.timeStamp = Date.now();
			chatbox.appendChild(newchat);
		}
	}

	function showMessage (msg, backgroundColor) {
		if (chatbox) {
			let newchat = document.createElement('span');
			newchat.innerText = msg;
			newchat.timeStamp = Date.now();

			if (backgroundColor) {
				newchat.style.backgroundColor = backgroundColor;
			}

			chatbox.appendChild(newchat);
		}
	}

	function parse (data) {
		if (!data || !data.data) {
			return;
		}

		let options = JSON.parse(data.data);

		//console.log(options);

		if (options.buffer) {
			buffername = options.buffer;
			window.location.hash = buffername;
		}

		if (options.username) {
			console.log("Username: " + options.username);
			cookies.username = options.username;
		}

		if (options.site) {
			crdt.site = options.site;
		}

		if (options.chat) {
			showChat(options.chatter, options.chat);
		}

		if (options.nodes) {
			updateDisplay(options.nodes);
		}
	}

	function chat (msg) {
		ws.send(JSON.stringify({chat: msg}));
	}

	function downloadAsFile (text, filename = 'download.txt') {
		let a = document.createElement('a');
		a.style.display = "none";
		a.download = filename;
		a.href = URL.createObjectURL(new Blob([text], {type: 'application/octet-stream'}));
		document.body.appendChild(a);
		a.click();
		a.remove();
	}

	function openFile () {
		fileinput.click();
	}

	function OpenWebSocket () {
		if (ws) {
			if (ws.readyState === 1) {
				return;
			}

			ws.close();
		}

		try {
			console.log("Opening new connection...");
			ws = new WebSocket("wss://" + window.location.hostname + '/syncpad/api/editserver');

			ws.onopen = () => {
				let initial = JSON.stringify({buffer: buffername, username: cookies.username});
				//console.log(initial);
				ws.send(initial);
			};

			ws.onmessage = parse;
			ws.onclose = OpenWebSocket;
		} catch (err) {
			setTimeout(OpenWebSocket, 1000);
		}
	}

	function evalCode () {
		if (currentMode !== "javascript") {
			showMessage("Eval only available for JavaScript!", "#800000");

			return;
		}

		try {
			let ret = Function(editor.getValue() + ";return main();")();
			showMessage(ret, "#008000");
		} catch (err) {
			showMessage(err, "#800000");
		}

	}

	window.addEventListener("load", () => {
		chatbox = $('chatbox');
		setInterval(() => {
			for (let c = 0; c < chatbox.children.length; c++) {
				if (chatbox.children[c].timeStamp + 10000 < Date.now() && chatbox.children[c].style.opacity !== "0") {
					chatbox.children[c].style.opacity = "0";
				}

				if (chatbox.children[c].timeStamp + 11000 < Date.now()) {
					chatbox.children[c].remove();
				}
			}
		}, 250);

		fileinput = document.createElement('input');
		fileinput.type = 'file';
		fileinput.style.display = "none";

		filereader.onload = () => {
			processDiffs(filereader.result);
			updateDisplay();
		};

		fileinput.onchange = () => {
			if (fileinput.files.length) {
				filereader.readAsText(fileinput.files[0]);
				fileinput.value = '';
			}
		};

		document.body.appendChild(fileinput);


		editor = ace.edit("editor");
		editor.setShowPrintMargin(false);
		editor.setOptions({
			fontSize: "10pt",
		});

		editor.commands.addCommand({
			name: "Save",
			bindKey: {
				win: "Ctrl-S",
				mac: "Command-S"
			},
			exec: () => downloadAsFile(editor.getValue(), languages[currentMode].file.replace("*", buffername)),
		});

		editor.commands.addCommand({
			name: "Open",
			bindKey: {
				win: "Ctrl-O",
				mac: "Command-O"
			},
			exec: () => openFile(),
		});

		editor.commands.addCommand({
			name: "Eval",
			bindKey: {
				win: "Ctrl-E",
				mac: "Command-E"
			},
			exec: () => evalCode(),
		});

		editor.on("change", () => processDiffs());

		let last = editor;
		document.addEventListener('focus', e => {
			if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
				e.stopPropagation();
				//console.log(e);
				last.focus();
			} else {
				last = e.target;
			}
		}, true);
		editor.focus();

		menubar = $("menubar");

		// mode menu
		let modemenu = $("modemenu");
		let column = 0;

		for (let k in languages) {
			column = (column + 1) % 2;
			let elem = document.createElement("span");
			elem.innerText = languages[k].display;
			elem.style.display = "inline-block";
			elem.style.width = "135px";
			languages[k].element = elem;
			elem.language = k;
			modemenu.appendChild(elem);

			elem.addEventListener('click', e => {
				if (languages[currentMode]) {
					languages[currentMode].element.style.filter = "";
				}

				currentMode = elem.language;
				editor.session.setMode(languages[currentMode].mode);
				elem.style.filter = selectFilter;
				window.location.hash = buffername + "#" + currentMode;
			});

			if (!column) {
				modemenu.appendChild(document.createElement('br'));
			}
		}

		if (!languages[currentMode]) {
			currentMode = "javascript";
		}

		editor.session.setMode(languages[currentMode].mode);
		languages[currentMode].element.style.filter = selectFilter;

		// theme select
		let thememenu = $("thememenu"), filemenu = $("filemenu");
		column = 0;

		for (let k in themes) {
			column = (column + 1) % 2;
			let elem = document.createElement("span");
			elem.innerText = themes[k].display;
			elem.style.display = "inline-block";
			elem.style.width = "150px";
			themes[k].element = elem;
			elem.theme = k;
			thememenu.appendChild(elem);

			elem.addEventListener('click', e => {
				if (themes[cookies.theme]) {
					themes[cookies.theme].element.style.filter = "";
				}

				cookies.theme = elem.theme;
				editor.setTheme(themes[cookies.theme].theme);
				elem.style.filter = selectFilter;
			});

			if (!column) {
				thememenu.appendChild(document.createElement('br'));
			}
		}

		if (!themes[cookies.theme]) {
			cookies.theme = "idle_fingers";
		}

		editor.renderer.on('themeLoaded', e => {
			let comp = window.getComputedStyle(editor.container);
			menubar.style.backgroundColor = comp.backgroundColor;
			menubar.style.color = comp.color;
			filemenu.style.borderColor = modemenu.style.borderColor = thememenu.style.borderColor = comp.color;
		});
		editor.setTheme(themes[cookies.theme].theme);
		themes[cookies.theme].element.style.filter = selectFilter;

		menubar = $("menubar");

		$("Save").addEventListener('click', () => downloadAsFile(editor.getValue(), languages[currentMode].file.replace("*", buffername)));
		$("Open").addEventListener('click', openFile);
		$("Eval").addEventListener('click', evalCode);
		$("setnick").addEventListener('click', () => {
			let ret = prompt("Enter your nickname:", cookies.username);

			if (!ret) {
				return ;
			}

			cookies.username = ret;

			if (ws && ws.readyState === 1) {
				ws.send(JSON.stringify({username: cookies.username}));
			}
		});
		$("chatmsg").addEventListener('keydown', e => {
			if (e.keyCode === 13 && ws && ws.readyState === 1) {
				chat(e.target.value);
				e.target.value = "";
			}
		});

		// start socket connection
		OpenWebSocket();
	}, false);
}
