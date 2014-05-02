/*
* Copyright (c) 2014 Hypnotic Crabman
*
* Permission is hereby granted, free of charge, to any person obtaining a
* copy of this software and associated documentation files (the "Software"),
* to deal in the Software without restriction, including without limitation
* the rights to use, copy, modify, merge, publish, distribute, sublicense,
* and/or sell copies of the Software, and to permit persons to whom the
* Software is furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
* FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
* DEALINGS IN THE SOFTWARE.
*/

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */
define(function (require, exports, module) {
    "use strict";
	
    var CommandManager  = brackets.getModule("command/CommandManager"),
		DocumentManager = brackets.getModule('document/DocumentManager'),
		EditorManager   = brackets.getModule('editor/EditorManager'),
		ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        Menus           = brackets.getModule("command/Menus"),
        PanelManager    = brackets.getModule("view/PanelManager"),
		Preferences	    = brackets.getModule("preferences/PreferencesManager"),
		Resizer         = brackets.getModule("utils/Resizer"),
		prefs           = Preferences.getExtensionPrefs("crabcode.outline");
	
	ExtensionUtils.loadStyleSheet(module, "styles.css");
	
	function findMatches(regex, content) {
		if (content === null) {
			return [];
		}
		
		var i, l,
			lines = content.split("\n"),
			result = [];
		
		for (i = 0; i < lines.length; i++) {
			var matches = lines[i].match(regex);
			
			if (matches !== null) {
				for (l = 0; l < matches.length; l++) {
					result.push([ matches[l].replace(regex, "$1").replace(/\s/g, ""), i,  lines[i].length]);
				}
			}
		}
		
		result.sort();
		
		return result;
	}
	
	function goToLine(e) {
		var currentEditor = EditorManager.getActiveEditor();
		currentEditor.setCursorPos(e.data.line, e.data.ch, true);
		currentEditor.focus();
	}
	
	function updateOutline() {
		var content, i, line, name, regex, type;
		var doc = DocumentManager.getCurrentDocument();
		
		$("#crabcode-outline-window").empty();
		
		if (doc !== null) {
			switch (doc.getLanguage().getName()) {
			
			case "JavaScript":
				regex = /function\s*(\w*)\(/g;
				
				var fkt = findMatches(regex, doc.getText());
				
				for (i = 0; i < fkt.length; i++) {
					name = fkt[i][0];
					
					if (name.length === 0) {
						if (prefs.get("unnamed"))
							name = "function";
						else
							continue;
					}
					
					$("#crabcode-outline-window").append($(document.createElement("div")).addClass("crabcode-outline-entry crabcode-outline-js-function").text(name).click({ line: fkt[i][1], ch: fkt[i][2] }, goToLine));
				}
				break;
			
			case "CSS":
				regex = /([^\r\n,{}]+)((?=[^}]*\{)|\s*\{)/g;
				
				var lines = findMatches(regex, doc.getText());
				
				for (i = 0; i < lines.length; i++) {
					switch (lines[i][0][0]) {
					case "#":
						type = "id";
						break;
						
					case ".":
						type = "class";
						break;
						
					case "@":
						type = "font";
						break;
						
					default:
						type = "tag";
						break;
					}
					
					$("#crabcode-outline-window").append($(document.createElement("div")).addClass("crabcode-outline-entry crabcode-outline-css-" + type).text(lines[i][0]).click({ line: lines[i][1], ch: lines[i][2] }, goToLine));
				}
				break;
			}
		}
	}
	
	function loadOutline() {
		var outline = $(document.createElement("div")).attr("id", "crabcode-outline");
		outline.append($(document.createElement("div")).attr("id", "crabcode-outline-header").text("Outline"));
		outline.append($(document.createElement("div")).attr("id", "crabcode-outline-window"));
		$("#sidebar").append(outline);
		
		Resizer.makeResizable(outline, "vert", "top", 75);
		
		$(DocumentManager).on('currentDocumentChange.bracketsCodeOutline', updateOutline);
		$(DocumentManager).on('documentSaved', updateOutline);
		$(DocumentManager).on('workingSetRemove.bracketsCodeOutline', updateOutline);
		
		updateOutline();
	}
	
    function toggleOutline() {
		var check = !this.getChecked();
        this.setChecked(check);
		
		prefs.set("enabled", check);
		prefs.save();
		
		if (check) {
			loadOutline();
		} else {
			$("#crabcode-outline").remove();
			$(DocumentManager).off('currentDocumentChange.bracketsCodeOutline');
			$(DocumentManager).off('documentSaved');
			$(DocumentManager).off('workingSetRemove.bracketsCodeOutline');
		}
    }
	
    function toggleUnnamed() {
		var check = !this.getChecked();
        this.setChecked(check);
		
		prefs.set("unnamed", check);
		prefs.save();
		
		if (prefs.get("enabled")) {
			updateOutline();
		}
    }
	
    var cmdOutline = CommandManager.register("Outline", "crabcode.outline.show", toggleOutline);
    var cmdUnnamed = CommandManager.register("Show Unnamed Functions", "crabcode.outline.unnamed", toggleUnnamed);
	
    var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
    menu.addMenuDivider();
    menu.addMenuItem("crabcode.outline.show");
    menu.addMenuItem("crabcode.outline.unnamed");
	
	if (typeof prefs.get("enabled") !== "boolean") {
		prefs.definePreference("enabled", "boolean", true);
		prefs.set("enabled", true);
		prefs.save();
	}
	
	if (typeof prefs.get("unnamed") !== "boolean") {
		prefs.definePreference("unnamed", "boolean", true);
		prefs.set("unnamed", true);
		prefs.save();
	}
	
	if (prefs.get("enabled")) {
		cmdOutline.setChecked(true);
		loadOutline();
	}
	
	if (prefs.get("unnamed")) {
		cmdUnnamed.setChecked(true);
	}
});