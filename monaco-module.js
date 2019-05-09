// es6 monaco-editor loading wrapped in a module
import * as Importer from "./sp-import.js";

window.require = {paths:{'vs': './node_modules/monaco-editor/dev/vs'}}; // global assign for the visual studio package

export default (async function () {
	await Importer.importCSS("./node_modules/monaco-editor/min/vs/editor/editor.main.css", "vs/editor/editor.main");
	await Importer.importScript(
		"./node_modules/monaco-editor/dev/vs/loader.js",
		"./node_modules/monaco-editor/dev/vs/editor/editor.main.nls.js",
		"./node_modules/monaco-editor/dev/vs/editor/editor.main.js",
	);
})();

