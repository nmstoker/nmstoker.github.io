/* global $ */

(function ($) {
	// wrap in anonymous function to not show some helper variables

	// regexp used for trimming
	var trimRegexp = /^\s*(.*?)\s*$/;
	var givenIndentRegexp = /#(\d+)given\s*/;
	var blankRegexp = /#blank([^#]*)/;
	var userStrings = {
		trash_label: 'Drag from here',
		solution_label: 'Construct your solution here, including indents',
		no_matching: function (lineNro) {
			return (
				'Based on language syntax, the highlighted fragment (' +
				lineNro +
				') is not correctly indented.'
			);
		},
	};

	// Create a line object skeleton with only code and indentation from
	// a code string of an assignment definition string (see parseCode)
	var ParsonsCodeline = function (codestring, widget) {
		this.widget = widget;
		this.code = '';
		this.indent = 0;
		if (codestring) {
			// Consecutive lines to be dragged as a single block of code have strings "\\n" to
			// represent newlines => replace them with actual new line characters "\n"
			this.code = codestring
				.replace(/#distractor\s*$/, '')
				.replace(trimRegexp, '$1')
				.replace(/\\n/g, '\n');
			this.code = codestring
				.replace(givenIndentRegexp, '')
				.replace(trimRegexp, '$1')
				.replace(/\\n/g, '\n');
			this.indent = codestring.length - codestring.replace(/^\s+/, '').length;
		}
	};

	// Creates a parsons widget. Init must be called after creating an object.
	var ParsonsWidget = function (options) {
		// Contains line objects of the user-draggable code.
		// The order is not meaningful (unchanged from the initial state) but
		// indent property for each line object is updated as the user moves
		// codelines around. (see parseCode for line object description)
		this.modified_lines = [];
		// contains line objects of distractors (see parseCode for line object description)
		this.extra_lines = [];
		// contains line objects (see parseCode for line object description)
		this.model_solution = [];

		var defaults = {
			x_indent: 50,
			can_indent: true,
			max_wrong_lines: 10,
			onSortableUpdate: () => {},
		};

		this.options = $.extend({}, defaults, options);
		this.id_prefix = 'sortable-codeline';

		// translate trash_label and solution_label
		if (!this.options['trash_label']) {
			this.options.trash_label = userStrings.trash_label;
		}
		if (!this.options['solution_label']) {
			this.options.solution_label = userStrings.solution_label;
		}
	};

	////Public methods

	// Parses an assignment definition given as a string and returns and
	// transforms this into an object defining the assignment with line objects.
	//
	// lines: A string that defines the solution to the assignment and also
	//   any possible distractors
	// max_distractrors: The number of distractors allowed to be included with
	//   the lines required in the solution
	ParsonsWidget.prototype.parseCode = function (lines, max_distractors) {
		var distractors = [],
			given = [],
			indented = [],
			widgetData = [],
			lineObject,
			errors = [],
			that = this;
		// Create line objects out of each codeline and separate
		// lines belonging to the solution and distractor lines
		// Fields in line objects:
		//   code: a string of the code, may include newline characters and
		//     thus in fact represents a block of consecutive lines
		//   indent: indentation level, -1 for distractors
		//   distractor: boolean whether this is a distractor
		//   orig: the original index of the line in the assignment definition string,
		//     for distractors this is not meaningful but for lines belonging to the
		//     solution, this is their expected position
		lines.forEach(function (item, index) {
			lineObject = new ParsonsCodeline(item, that);
			lineObject.orig = index;
			if (item.search(/#distractor\s*$/) >= 0) {
				// This line is a distractor
				lineObject.indent = -1;
				lineObject.distractor = true;
				if (lineObject.code.length > 0) {
					// The line is non-empty, not just whitespace
					distractors.push(lineObject);
				}
				// These lines are part of the final solution
			} else if (item.search(givenIndentRegexp) >= 0) {
				if (lineObject.code.length > 0) {
					lineObject.indent = parseInt(item.match(givenIndentRegexp)[1]);
					lineObject.distractor = false;
					given.push(lineObject);
				}
			} else {
				// Initialize line object with code and indentation properties
				if (lineObject.code.length > 0) {
					// The line is non-empty, not just whitespace
					lineObject.distractor = false;
					indented.push(lineObject);
				}
			}
		});

		indented.forEach(function (item) {
			if (item.indent < 0) {
				// Indentation error
				errors.push(userStrings.no_matching(indented.orig));
			}
			widgetData.push(item);
		});

		given.forEach(function (item) {
			widgetData.push(item);
		});

		// Remove extra distractors if there are more alternative distrators
		// than should be shown at a time
		var permutation = this.getRandomPermutation(distractors.length);
		var selected_distractors = [];
		for (var i = 0; i < Math.min(max_distractors, distractors.length); i++) {
			selected_distractors.push(distractors[permutation[i]]);
			widgetData.push(distractors[permutation[i]]);
		}
		return {
			// an array of line objects specifying  the solution
			solution: indented,
			// an array of line objects specifying the requested number
			// of distractors (not all possible alternatives)
			distractors: selected_distractors,
			given: given,
			// an array of line objects specifying the initial code arrangement
			// given to the user to use in constructing the solution
			widgetInitial: widgetData,
			errors: errors,
		};
	};

	ParsonsWidget.prototype.init = function (text) {
		// TODO: Error handling, parseCode may return errors in an array in property named errors.
		var initial_structures = this.parseCode(
			text.split('\n'),
			this.options.max_wrong_lines
		);
		this.model_solution = initial_structures.solution;
		this.given = initial_structures.given;
		this.extra_lines = initial_structures.distractors;
		this.modified_lines = initial_structures.widgetInitial;

		this.modified_lines.forEach((item, index) => {
			item.id = this.id_prefix + index;
		});
	};

	ParsonsWidget.prototype.setLineNumbers = function () {
		// Removes all line numbers
		$('.line-number').remove();
		var lines = $('#ul-parsons-solution').children('li');
		lines.each(function () {
			var line = $(this);
			var lineNumber = line.index() + 1;
			line.append('<code class="line-number"> ' + lineNumber + '</code>');
		});
	};

	ParsonsWidget.prototype.solutionCode = function () {
		const indentConstant = '    ';
		let solutionCode = '';
		const lines = this.getModifiedCode(
			this.options.sortableId.querySelector('ul')
		);
		for (let i = 0; i < lines.length; i++) {
			let codeClone = document.getElementById(lines[i].id).cloneNode(true);
			codeClone.querySelectorAll('input').forEach(function (inp) {
				inp.replaceWith(inp.value);
			});
			codeClone.querySelectorAll('.line-number').forEach(function (elem) {
				elem.remove();
			});
			codeClone.innerText = codeClone.innerText.trimRight();
			solutionCode +=
				indentConstant.repeat(lines[i].indent) + codeClone.innerText + '\n';
		}
		return solutionCode;
	};

	ParsonsWidget.prototype.reprCode = function () {
		var reprCodeSoln = '';
		var reprCodeNonSoln = '';
		var lines = this.getModifiedCode(
			this.options.sortableId.querySelector('ul')
		);
		var lines_in_soln = [];
		// find lines in solution
		for (let i = 0; i < lines.length; i++) {
			lines_in_soln.push(lines[i].id);
			let blankText = '';
			let yamlConfigClone = document
				.getElementById(lines[i].id)
				.cloneNode(true);
			yamlConfigClone.querySelectorAll('input').forEach(function (inp) {
				inp.replaceWith('!BLANK');
				blankText += ' #blank' + inp.value;
			});
			yamlConfigClone.innerText = yamlConfigClone.innerText.trimRight();
			let line = yamlConfigClone.innerText;
			line = line + ` #${lines[i].indent}given` + blankText;
			reprCodeSoln += line + '\n';
		}
		for (let i = 0; i < this.modified_lines.length; i++) {
			if (!lines_in_soln.includes(this.modified_lines[i].id)) {
				let yamlConfigClone = document
					.getElementById(this.modified_lines[i].id)
					.cloneNode(true);
				yamlConfigClone.querySelectorAll('input').forEach(function (inp) {
					inp.replaceWith('!BLANK');
				});
				yamlConfigClone.innerText = yamlConfigClone.innerText.trimRight();
				let line = yamlConfigClone.innerText;
				reprCodeNonSoln += line + '\n';
			}
		}
		return reprCodeSoln + reprCodeNonSoln;
	};

	/**
	 * Update indentation of a line based on new coordinates
	 * leftDiff horizontal difference from (before and after drag) in px
	 ***/
	ParsonsWidget.prototype.updateIndent = function (leftDiff, id) {
		var code_line = this.getLineById(id);
		var new_indent = this.options.can_indent
			? code_line.indent + Math.floor(leftDiff / this.options.x_indent)
			: 0;
		new_indent = Math.max(0, new_indent);
		code_line.indent = new_indent;

		return new_indent;
	};

	// Get a line object by the full id including id prefix
	// (see parseCode for description of line objects)
	ParsonsWidget.prototype.getLineById = function (id) {
		var index = -1;
		for (var i = 0; i < this.modified_lines.length; i++) {
			if (this.modified_lines[i].id == id) {
				index = i;
				break;
			}
		}
		return this.modified_lines[index];
	};

	/**
	 * Retrieve the code lines based on what is in the DOM
	 * */
	ParsonsWidget.prototype.getModifiedCode = function (sortableCodeUL) {
		//ids of the the modified code
		var lines_to_return = [],
			solution_ids = $(sortableCodeUL).sortable('toArray'),
			i,
			item;
		for (i = 0; i < solution_ids.length; i++) {
			item = this.getLineById(solution_ids[i]);
			lines_to_return.push(Object.assign(new ParsonsCodeline(), item));
		}
		return lines_to_return;
	};

	ParsonsWidget.prototype.getRandomPermutation = function (n) {
		var permutation = [];
		var i;
		for (i = 0; i < n; i++) {
			permutation.push(i);
		}
		var swap1, swap2, tmp;
		for (i = 0; i < n; i++) {
			swap1 = Math.floor(Math.random() * n);
			swap2 = Math.floor(Math.random() * n);
			tmp = permutation[swap1];
			permutation[swap1] = permutation[swap2];
			permutation[swap2] = tmp;
		}
		return permutation;
	};

	ParsonsWidget.prototype.alphabetize = function () {
		function compare(a, b) {
			// TODO(nweinman): Remove these conditionals once new print/comment UI is ready.
			if (a.code.startsWith('#')) {
				return 1;
			} else if (a.code.startsWith('print(')) {
				return 1;
			} else if (a.code.startsWith('p !BLANK')) {
				return 1;
			} else if (b.code.startsWith('#')) {
				return -1;
			} else if (b.code.startsWith('print(')) {
				return -1;
			} else if (b.code.startsWith('p !BLANK')) {
				return -1;
			} else if (a.code > b.code) {
				return 1;
			} else if (a.code < b.code) {
				return -1;
			} else {
				return 0;
			}
		}
		var codeLines = this.modified_lines.slice();
		codeLines.sort(compare);
		var idlist = [];
		for (let i = 0; i < codeLines.length; i += 1) {
			if (this.given.slice().indexOf(codeLines[i]) < 0) {
				idlist.push(codeLines[i].id);
			}
		}
		var givenCodeLines = this.given.slice();
		var givenIdlist = [];
		for (let i = 0; i < givenCodeLines.length; i += 1) {
			givenIdlist.push(givenCodeLines[i].id);
		}
		if (this.options.trashId) {
			this.createHTMLFromLists(givenIdlist, idlist);
		} else {
			this.createHTMLFromLists(idlist, []);
		}

		// TODO: Move somewhere else or remove after better UI PR.
		codeLines.forEach(function (codeLine) {
			if (
				codeLine.code.startsWith('# <input') ||
				codeLine.code.includes('DEBUG') ||
				codeLine.code.startsWith('p <input')
			) {
				document.getElementById(codeLine.id).style.backgroundColor =
					'lightblue';
			}
		});
	};

	ParsonsWidget.prototype.updateHTMLIndent = function (codelineID) {
		var line = this.getLineById(codelineID);
		document.getElementById(codelineID).style.marginLeft =
			this.options.x_indent * line.indent + 'px';
		this.updateVertLines();
	};

	ParsonsWidget.prototype.updateVertLines = function (excludedItem) {
		if (!this.options.can_indent) {
			return;
		}

		var maxIndent = 0;
		this.modified_lines.forEach(function (line) {
			if (!excludedItem || line != excludedItem) {
				maxIndent = Math.max(maxIndent, line.indent);
			}
		});
		// Get current indents
		var element = this.options.sortableId.querySelector('ul');
		var backgroundColor = 'rgb(255, 255, 170)';
		var backgroundPosition = '';
		for (var i = 1; i <= maxIndent + 1; i++) {
			backgroundPosition += i * this.options.x_indent + 'px 0, ';
		}

		element.style.background =
			'linear-gradient(#ee0, #ee0) no-repeat border-box, '
				.repeat(maxIndent)
				.slice(0) +
			'repeating-linear-gradient(0,#ee0,#ee0 10px,' +
			backgroundColor +
			' 10px, ' +
			backgroundColor +
			' 20px) no-repeat border-box';
		element.style.backgroundSize = '1px 100%, '
			.repeat(maxIndent + 1)
			.slice(0, -2);
		element.style.backgroundPosition = backgroundPosition.slice(0, -2);
		element.style.backgroundOrigin = 'padding-box, '
			.repeat(maxIndent + 1)
			.slice(0, -2);
		element.style.backgroundColor = backgroundColor;
	};

	ParsonsWidget.prototype.codeLineToHTML = function (codeline) {
		while (codeline.code.search(/!BLANK/) >= 0) {
			var replaceText = '';
			if (codeline.code.search(blankRegexp) >= 0) {
				replaceText = codeline.code
					.match(blankRegexp)[1]
					.trim()
					.replace(/"/g, '&quot;')
					.replace(/'/g, '&apos;');
				codeline.code = codeline.code.replace(blankRegexp, '');
			}
			codeline.code = codeline.code.replace(/!BLANK/, function () {
				return (
					"<input type='text' class='text-box' value=\"" +
					replaceText +
					'" ' +
					"style = 'width: " +
					(replaceText.length + 3) * 8 +
					"px'" +
					"onkeyup=\"this.style.width = ((this.value.length + 3) * 8) + 'px';\"'/>"
				);
			});
		}
		return '<li id="' + codeline.id + '">' + codeline.code + '</li>';
	};

	ParsonsWidget.prototype.codeLinesToHTML = function (codelineIDs) {
		var lineHTML = [];
		for (var id in codelineIDs) {
			var line = this.getLineById(codelineIDs[id]);
			lineHTML.push(this.codeLineToHTML(line));
		}
		return '<ul>' + lineHTML.join('') + '</ul>';
	};

	/** modifies the DOM by inserting exercise elements into it */
	ParsonsWidget.prototype.createHTMLFromLists = function (solutionIDs, trashIDs) {
		var html;
		if (this.options.trashId) {
			html =
				(this.options.trash_label
					? '<p>' + this.options.trash_label + '</p>'
					: '') + this.codeLinesToHTML(trashIDs);
			this.options.trashId.innerHTML = html;
			html =
				(this.options.solution_label
					? '<p>' + this.options.solution_label + '</p>'
					: '') + this.codeLinesToHTML(solutionIDs);
			this.options.sortableId.innerHTML = html;
		} else {
			html = this.codeLinesToHTML(solutionIDs);
			this.options.sortableId.innerHTML = html;
		}

		var that = this;

		var sortable = $(this.options.sortableId.querySelector('ul')).sortable({
			stop: function (event, ui) {
				if ($(event.target)[0] != ui.item.parent()[0]) {
					return;
				}
				that.updateIndent(
					ui.position.left - ui.item.parent().position().left,
					ui.item[0].id
				);
				that.updateHTMLIndent(ui.item[0].id);
			},
			receive: function (event, ui) {
				that.updateIndent(
					ui.position.left - ui.item.parent().position().left,
					ui.item[0].id
				);
				that.updateHTMLIndent(ui.item[0].id);
			},
			update: (e) => {
				this.setLineNumbers();
				this.options.onSortableUpdate(e);
			},
			grid: that.options.can_indent ? [that.options.x_indent, 1] : false,
		});
		sortable.addClass('output');
		if (this.options.trashId) {
			var trash = $(this.options.trashId.querySelector('ul')).sortable({
				connectWith: sortable,
				receive: function (event, ui) {
					that.getLineById(ui.item[0].id).indent = 0;
					that.updateHTMLIndent(ui.item[0].id);
				},
				stop: function (event, ui) {
					if ($(event.target)[0] != ui.item.parent()[0]) {
						// line moved to output and logged there
						return;
					}
				},
			});
			sortable.sortable('option', 'connectWith', trash);
		}
		solutionIDs.forEach(function (id) {
			that.updateHTMLIndent(id);
		});
	};

	window['ParsonsWidget'] = ParsonsWidget;
})(
	// allows _ and $ to be modified with noconflict without changing the globals
	// that parsons uses
	$
);
