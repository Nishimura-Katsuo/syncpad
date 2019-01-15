const cookie = {};
const cookies = cookie;

function saveCookies () {
	const expireDate = "Thu, 18 Dec 2013 12:00:00 UTC";
	const foreverDate = "Thu, 18 Dec 4013 12:00:00 UTC";
	var ka = Object.keys(cookie);

	for (var i = 0;i < ka.length;i++) {
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

	var ca = document.cookie.split(';');

	for (var i = 0;i < ca.length;i++) {
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
