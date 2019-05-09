// object-based cookie manager, since browser cookies suck

let foreverDate = 'Thu, 18 Dec 4013 12:00:00 UTC', _cookies = {};

export let cookies = new Proxy(_cookies, {
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

export default cookies
