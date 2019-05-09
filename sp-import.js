export async function importScript(...paths) {
	let promises = paths.map(path => new Promise((resolve, reject) => {
		let scriptNode = document.createElement('script');
		scriptNode.src = path;
		scriptNode.async = false;
		scriptNode.addEventListener('load', resolve);
		scriptNode.addEventListener('error', reject);
		document.head.appendChild(scriptNode);
	}));
	for(let promise of promises) {
		await promise;
	}
}

export function importCSS(path, dataName) {
	return new Promise((resolve, reject) => {
		let cssNode = document.createElement('link');
		cssNode.href = path;
		cssNode.rel = "stylesheet";
		if(dataName) {
			cssNode["data-name"] = dataName;
		}
		cssNode.addEventListener('load', resolve);
		cssNode.addEventListener('error', reject);
		document.head.appendChild(cssNode);
	});
}

export let Importer = {
	importScript: importScript,
	importCSS: importCSS,
};

export default Importer
