"use strict";
// The sss extension signals my server to treat this as a module for api interface

/* global module process htmlDocs */
let simpleTextCRDT = require(htmlDocs + '/syncpad/simpleTextCRDT.js').simpleTextCRDT;
let defaultBuffer = new simpleTextCRDT();
'// type some code!\n'.split('').forEach((v, i) => defaultBuffer.addNode(v, i));
let charPool = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
let guestNumber = 0, guestprefix = "Guest", site = 1;

let randomStr = () => {
	let c = 12, retstr = "";

	while (c--) {
		retstr += charPool[(Math.random() * charPool.length) | 0];
	}

	return retstr;
};

let buffer = {};

function sendToRoom (msg, ws, wss) {
	if (ws.site !== undefined && ws.currentbuffer) {
		msg = typeof msg === 'string' ? msg : JSON.stringify(msg);

		if (msg !== '{}') {
			wss.clients.forEach(client => {
				if (client !== ws && client.currentbuffer === ws.currentbuffer) {
					try {
						client.send(msg);
					} catch (err) {
						ws.send(JSON.stringify({error: err}));
					}
				}
			});
		}
	}
}

function sendToSelf (msg, ws) {
	msg = typeof msg === 'string' ? msg : JSON.stringify(msg);

	if (msg !== '{}') {
		ws.send(msg);
	}
}

module.exports.connect = (ws, wss) => { // websocket connection
	ws.on('close', () => {
		sendToRoom({disconnect: ws.site}, ws, wss);
	});
	ws.on('message', data => {
		try {
			let input = JSON.parse(data);
			let output = {}, returnBuffer = false, start = process.hrtime();
			let broadcast = {};

			if (!ws.site) {
				ws.site = site++;
				output.site = ws.site;
			}

			if (input.buffer && input.buffer.length) {
				sendToRoom({disconnect: ws.site}, ws, wss);
				ws.currentbuffer = input.buffer;
				broadcast.connect = ws.site;
				let sites = [];
				let usernames = {};
				wss.clients.forEach(client => {
					if (client !== ws && client.currentbuffer === ws.currentbuffer) {
						sites.push(client.site);
						usernames[client.site] = client.username || '';
					}
				});

				if (sites.length) {
					output.connect = sites;
					output.usernames = usernames;
				}

				returnBuffer = true;
			} else if (!ws.currentbuffer) {
				output.buffer = ws.currentbuffer = randomStr();

				while (buffer[ws.currentbuffer] !== undefined) {
					output.buffer = ws.currentbuffer = randomStr();
				}

				returnBuffer = true;
			}

			if (buffer[ws.currentbuffer] === undefined) {
				buffer[ws.currentbuffer] = new simpleTextCRDT();
				buffer[ws.currentbuffer].useTombstones = false;
				buffer[ws.currentbuffer].nodes = defaultBuffer.nodes.slice();
				// fix lamport if we decide to add edits on the server (probably not)
				returnBuffer = true;
			}

			if (input.nodes && input.nodes.length) {
				buffer[ws.currentbuffer].mergeNodes(input.nodes);
				broadcast.nodes = input.nodes;
			}

			if (typeof input.username === 'string' && input.username.length) {
				if (input.username.slice(0, guestprefix.length) !== guestprefix) {
					output.username = ws.username = input.username;
				} else {
					output.username = ws.username = guestprefix + (++guestNumber);
				}

				broadcast.usernames = broadcast.usernames || {};
				broadcast.usernames[ws.site] = ws.username;
			} else if (!ws.username) {
				output.username = ws.username = guestprefix + (++guestNumber);
				broadcast.usernames = broadcast.usernames || {};
				broadcast.usernames[ws.site] = ws.username;
			}

			if (typeof input.username === 'string' && input.username.length && input.username.slice(0, guestprefix.length) !== guestprefix) {
				output.username = ws.username = input.username;
				broadcast.usernames = broadcast.usernames || {};
				broadcast.usernames[ws.site] = ws.username;
			}

			if (input.chat && ws.username) {
				output.chatter = broadcast.chatter = ws.username;
				output.chat = broadcast.chat = input.chat;
			}

			if (input.cursor) {
				broadcast.cursor = {site: ws.site, position: input.cursor};
			}

			if (returnBuffer) {
				output.nodes = buffer[ws.currentbuffer].nodes;
				output.tombstones = buffer[ws.currentbuffer].tombstones;
				output.new = true;
			}

			let diff = process.hrtime(start);
			output.requestLength = diff[0] * 1e9 + diff[1];
			sendToSelf(output, ws);
			sendToRoom(broadcast, ws, wss);
		} catch (err) {
			console.log(err);
			sendToSelf({error: err}, ws);
		}
	});

	return true;
};
