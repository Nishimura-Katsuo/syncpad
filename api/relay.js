'use strict';

/* global module process WebSocket __dirname */
const path = require('path');
const fs = require('fs');
let charPool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
let guestNumber = 0, guestprefix = 'Guest', site = 1;
let paddir = path.resolve(__dirname, '../pads');

let randomStr = () => {
	let c = 12, retstr = '';

	while (c--) {
		retstr += charPool[(Math.random() * charPool.length) | 0];
	}

	return retstr;
};

function sendToRoom (msg, ws, wss) {
	if (ws.site !== undefined && ws.currentbuffer) {
		msg = typeof msg === 'string' ? msg : JSON.stringify(msg);

		if (msg !== '{}') {
			wss.clients.forEach(client => {
				if (client !== ws && client.currentbuffer === ws.currentbuffer) {
					try {
						if (client.readyState === WebSocket.OPEN) {
							client.send(msg);
						}
					} catch (err) {
						if (ws.readyState === WebSocket.OPEN) {
							ws.send(JSON.stringify({error: err}));
						}
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
			let output = {}, start = process.hrtime();
			let broadcast = {};

			if (!ws.site) {
				ws.site = site++;
				output.site = ws.site;
			}

			if (input.buffer && input.buffer.length) {
				input.buffer = input.buffer.replace(/[./]/g, '');
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

				if (fs.existsSync(paddir + '/' + input.buffer)) {
					output.nodes = fs.readFileSync(paddir + '/' + input.buffer, {encoding: 'utf8'});
				} else {
					fs.writeFileSync(paddir + '/' + output.buffer, '');
					output.initialize = true;
				}

				output.new = true;
			} else if (!ws.currentbuffer) {
				output.buffer = ws.currentbuffer = randomStr();

				while (fs.existsSync(paddir + '/' + output.buffer)) {
					output.buffer = ws.currentbuffer = randomStr();
				}

				fs.writeFileSync(paddir + '/' + output.buffer, '');
				output.initialize = true;
				output.new = true;
			}

			if (input.nodes && input.nodes.length) {
				fs.writeFileSync(paddir + '/' + ws.currentbuffer, JSON.stringify(input.nodes) + ',', {flag: 'a'});
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
