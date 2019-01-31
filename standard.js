"use strict";

/* global setTimeout */

const cookie = {};
const cookies = cookie;

function saveCookies () {
	const expireDate = "Thu, 18 Dec 2013 12:00:00 UTC";
	const foreverDate = "Thu, 18 Dec 4013 12:00:00 UTC";
	let ka = Object.keys(cookie);

	for (let i = 0; i < ka.length; i++) {
		let ck = ka[i];
		let cc = cookie[ck];

		if (cc === undefined || cc === null) {
			document.cookie = ck + "=;path=/;expires=" + expireDate;
		} else {
			document.cookie = ck + "=" + JSON.stringify(cc) + ";path=/;expires=" + foreverDate;
		}
	}
}

(() => {
	if (typeof document.cookie !== "string") {
		return;
	}

	let ca = document.cookie.split(';');

	for (let i = 0; i < ca.length; i++) {
		let ep = ca[i].indexOf("=");

		if (ep > -1) {
			let ck = ca[i].substr(0, ep).trim();
			let cv = ca[i].substr(ep + 1);

			try {
				cookie[ck] = JSON.parse(cv);
			} catch (e) {
				// do nothing?
			}
		}
	}

	window.addEventListener('beforeunload', saveCookies, {passive: true});
})();

function fastElement (eOpt) {
	var new_obj, eParent;

	if (eOpt.tag) {
		new_obj = document.createElement(eOpt.tag);
		delete eOpt.tag;
	} else {
		new_obj = document.createElement('div');
	}

	if (eOpt.parent) {
		eParent = eOpt.parent;

		if (typeof eParent === 'string') {
			eParent = document.getElementById(eParent);
		}

		delete eOpt.parent;
	} else {
		eParent = document.body;
	}

	if (eOpt.style) {
		Object.assign(new_obj.style, eOpt.style);
		delete eOpt.style;
	}

	Object.assign(new_obj, eOpt);

	if (eParent && eParent.appendChild) {
		eParent.appendChild(new_obj);
	}

	return new_obj;
}

let delay = timeOut => new Promise(resolve => setTimeout(resolve, timeOut));

// my 'jQuerySuperExtraLite'

let $ = typeof document !== 'undefined' ? document.getElementById.bind(document) : () => {
	throw 'Document does not exist';
};

/* globals HTMLElement module*/

if (typeof HTMLElement !== 'undefined') {
	HTMLElement.prototype.forEachChild = function (cb, context = this) {
		for (let c = 0, C = this.children.length; c < C; c++) {
			this.children[c] && cb.call(context, this.children[c], c, this);
		}
	};
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	Object.apply(module.exports, {
		cookies: cookies,
		fastElement: fastElement,
		delay: delay,
		$: $,
	});
}
