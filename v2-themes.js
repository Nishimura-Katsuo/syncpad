// themes for monaco-editor

export let custom = {
	codeFingers: {
		base: 'vs-dark',
		inherit: false,
		rules: [
			{ token: '', foreground: 'D4D4D4', background: '1E1E1E' },
			{ token: 'text', foreground: 'D4D4D4' },
			{ token: 'invalid', foreground: 'f44747' },
			{ token: 'emphasis', fontStyle: 'italic' },
			{ token: 'strong', fontStyle: 'bold' },

			{ token: 'variable', foreground: '74B0DF' },
			{ token: 'variable.predefined', foreground: 'EEDD00' },
			{ token: 'variable.parameter', foreground: '9CDCFE', fontStyle: 'italic' },
			{ token: "constant", foreground: "6C99BB" },
			{ token: "comment", fontStyle: "italic", foreground: "BC9458" },
			{ token: 'number', foreground: 'B5CEA8' },
			{ token: 'number.hex', foreground: '5BB498' },
			{ token: "regexp", foreground: "CCCC33" },
			{ token: 'annotation', foreground: 'cc6666' },
			{ token: 'type', foreground: 'EEBB00' },

			{ token: 'delimiter', foreground: 'DCDCDC' },
			{ token: 'delimiter.html', foreground: '808080' },
			{ token: 'delimiter.xml', foreground: '808080' },

			{ token: 'tag', foreground: 'FFE5BB' },
			{ token: 'tag.id.pug', foreground: 'FFE5BB' },
			{ token: 'tag.class.pug', foreground: 'FFE5BB' },
			{ token: 'meta', foreground: 'FFE5BB' },
			{ token: 'meta.tag', foreground: 'FFE5BB' },
			{ token: 'metatag', foreground: 'FF8080' },
			{ token: 'metatag.content.html', fontStyle: 'bold' },
			{ token: 'metatag.html', fontStyle: 'bold' },
			{ token: 'metatag.xml', fontStyle: 'bold' },
			{ token: 'metatag.php', fontStyle: 'bold' },

			{ token: 'key', foreground: '9CDCFE' },
			{ token: 'string.key.json', foreground: '9CDCFE' },
			{ token: 'string.value.json', foreground: 'CE9178' },

			{ token: 'attribute.name', foreground: '9CDCFE' },
			{ token: 'attribute.value', foreground: 'CE9178' },
			{ token: 'attribute.value.number.css', foreground: 'B5CEA8' },
			{ token: 'attribute.value.unit.css', foreground: 'B5CEA8' },
			{ token: 'attribute.value.hex.css', foreground: 'D4D4D4' },

			{ token: "string", foreground: "#A5C261" },
			{ token: 'string.sql', foreground: 'FF0000' },

			{ token: 'keyword', foreground: 'CC7833' },
			{ token: 'keyword.flow', foreground: 'C586C0' },
			{ token: 'keyword.json', foreground: 'CE9178' },
			{ token: 'keyword.flow.scss', foreground: '569CD6' },

			{ token: 'operator.scss', foreground: '909090' },
			{ token: 'operator.sql', foreground: '778899' },
			{ token: 'operator.swift', foreground: '909090' },
			{ token: 'predefined.sql', foreground: 'FF00FF' },
		],
		colors: {
			'editorCursor.foreground': '#91FF00',
			'editor.foreground': '#FFFFFF',
			'editor.background': '#323232',
			'editorLineNumber.foreground': '#999999',
			'editorLineNumber.activeForeground': '#FFFFFF',
			'editorGutter.background': '#3b3b3b',
			'editor.lineHighlightBackground': '#353637',
			'editor.lineHighlightBorder': '#353637',
			'editor.inactiveSelection': '#3A3D41',
			'editor.indentGuides': '#404040',
			'editor.activeIndentGuides': '#707070',
			'editor.selectionHighlightBackground': '#00000000',
			'editor.selectionHighlightBorder': '#5A647EE1',
			'editor.selectionBackground': '#5A647EE1',
		}
	},
	idleFingers: {
		base: "vs-dark",
		inherit: false,
		rules: [
			{ token: '', foreground: 'D4D4D4', background: '1E1E1E' },
			{ token: "text", foreground: "FFFFFF" },
			{ token: "source", background: "282828", foreground: "CDCDCD" },
			{ token: "comment", fontStyle: "italic", foreground: "BC9458" },
			{ token: "meta.tag", foreground: "FFE5BB" },
			{ token: "declaration.tag", foreground: "FFE5BB" },
			{ token: "meta.doctype", foreground: "FFE5BB" },
			{ token: "entity.name", foreground: "FFC66D" },
			{ token: "source.ruby entity.name", foreground: "FFF980" },
			{ token: "variable.other", foreground: "B7DFF8" },
			{ token: "support.class.ruby", foreground: "CCCC33" },
			{ token: "constant", foreground: "6C99BB" },
			{ token: "support.constant", foreground: "6C99BB" },
			{ token: "keyword", fontStyle: "", foreground: "CC7833" },
			{ token: "other.preprocessor.c", fontStyle: "", foreground: "D0D0FF" },
			{ token: "entity.name.preprocessor", fontStyle: "" },
			{ token: "entity.name.function", fontStyle: "" },
			{ token: "variable.parameter", fontStyle: "italic" },
			{ token: "source comment.block", background: "575757", foreground: "FFFFFF" },
			{ token: "string", foreground: "A5C261" },
			{ token: "constant.character.escape", foreground: "AAAAAA" },
			{ token: "string.interpolated", background: "CCCC33", foreground: "000000" },
			{ token: "regexp", foreground: "CCCC33" },
			{ token: "string.literal", foreground: "CCCC33" },
			{ token: "string.interpolated constant.character.escape", foreground: "787878" },
			{ token: "entity.name.class", fontStyle: "underline" },
			{ token: "entity.other.inherited-class", fontStyle: "italic underline" },
			{ token: "entity.name.tag", fontStyle: "" },
			{ token: "entity.other.attribute-name", fontStyle: "" },
			{ token: "support.function", fontStyle: "", foreground: "B83426" },
			{ token: "markup.list.unnumbered.textile", foreground: "6EA533" },
			{ token: "markup.list.numbered.textile", foreground: "6EA533" },
			{ token: "markup.bold.textile", fontStyle: "bold", foreground: "C2C2C2" },
			{ token: "invalid", background: "FF0000", fontStyle: "", foreground: "FFFFFF" },
			{ token: "collab.user1", background: "FFF980", foreground: "323232" }
		],
		colors: {
			"background": "#323232",
			"invisibles": "#404040",
			'editorCursor.foreground': '#91FF00',
			'editor.foreground': '#FFFFFF',
			'editor.background': '#323232',
			'editorLineNumber.foreground': '#999999',
			'editorLineNumber.activeForeground': '#FFFFFF',
			'editorGutter.background': '#3b3b3b',
			'editor.lineHighlightBackground': '#353637',
			'editor.lineHighlightBorder': '#353637',
			'editor.inactiveSelection': '#3A3D41',
			'editor.indentGuides': '#404040',
			'editor.activeIndentGuides': '#707070',
			'editor.selectionHighlightBackground': '#00000000',
			'editor.selectionHighlightBorder': '#5A647EE1',
			'editor.selectionBackground': '#5A647EE1',
		}
	}
};

export let themes = [
	{id: 'vs', name: 'VS Code Light'},
	{id: 'vs-dark', name: 'VS Code Dark'},
	{id: 'hc-black', name: 'High Contrast'},
	{id: 'codeFingers', name: 'codeFingers (incomplete)'},
];

export default {themes, custom};
