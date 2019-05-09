let evalQueue = [], messageFunc, evalws;

export function setMessageFunc(func) {
	messageFunc = func;
}

function remoteEvalConnect () {
	if (!evalws || evalws.readyState > 1) {
		evalws = new WebSocket('wss://' + window.location.hostname + '/eval');
	}

	evalws.onclose = remoteEvalConnect;

	evalws.onmessage = e => {
		messageFunc(e.data);
	};

	evalws.onopen = () => {
		evalQueue.forEach(text => evalws.send(text));
		evalQueue = [];
	};
}

export function remoteEval (text, lang) {
	if (!text) {
		return;
	}

	remoteEvalConnect();

	text = JSON.stringify({program: lang, data: text});

	if (evalws.readyState === 1) {
		evalws.send(text);
	} else {
		evalQueue.push(text);
	}
}

export default { setMessageFunc, remoteEval }
