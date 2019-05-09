// es6 vue loading wrapped in a module
import * as Importer from "./sp-import.js";

export default (async function () {
	await Importer.importScript(
		"https://cdn.jsdelivr.net/npm/vue/dist/vue.js",
	);
})();

