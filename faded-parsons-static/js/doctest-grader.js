// function findNextUnindentedLine(lines, start) {
	/*
    Finds the next piece of unindented code in the file. Ignores empty lines and lines
    that start with a space or tab. Returns len(lines) if no unindented line found.
    */
// 	let lineNum = start;
// 	while (lineNum < lines.length) {
// 		const line = lines[lineNum];
// 		if (!(line == '' || line[0] == ' ' || line[0] == '\t' || line[0] == '\n')) {
// 			break;
// 		}
// 		lineNum++;
// 	}
// 	return lineNum;
// }

function countDocstringLines(lines) {
	let startLine = -1;
	let inDocstring = false;
	lines.forEach((line, i) => {
		if (line.trim().includes('"""')) {
			if (inDocstring) {
				startLine = i + 1;
				return;
			}
			inDocstring = true;
		}
	});
	return startLine;
}

function extractError(error, numDocstringLines) {
	let startI = -1;
	let endI = -1;
	let lineNum;
	const errorLines = error.split('\n');
	for (var i = errorLines.length - 1; i >= 0; i--) {
		let line = errorLines[i];
		if (line.startsWith('SyntaxError') || line.startsWith('IndentationError')) {
			endI = i;
		} else if (line.includes('File "<exec>", line')) {
			lineNum = parseInt(line.split(', line ')[1], 10);
			lineNum -= numDocstringLines - 1;
			startI = i;
			break;
		}
	}
	if (startI == -1 || endI == -1) {
		return 'No error report found.';
	} else {
		return (
			`Error at line ${lineNum}:\n` +
			errorLines.slice(startI + 1, endI + 1).join('\n')
		);
	}
}

function cleanupDoctestResults(resultsStr) {
	let keptLines = [];
	let inKeepRange = false;
	resultsStr.split('\n').forEach((line) => {
		if (line.startsWith('File "__main__"')) {
			inKeepRange = true;
			return;
		} else if (
			line.startsWith('Trying:') ||
			line.startsWith('1 items had no tests:')
		) {
			inKeepRange = false;
		}
		if (inKeepRange) {
			line = line.replace('Failed example:', '\n❌ Failed example:');
			keptLines.push(line);
		}
	});
	return keptLines.join('\n');
}

export function prepareCode(submittedCode, codeHeader, probDescription, testFn) {
	submittedCode += '\n';
	//console.log('codeHeader is:\n' + codeHeader);
	//console.log('submittedCode is:\n' + submittedCode);
	let lines = codeHeader.split('\n');
	const startLine = countDocstringLines(lines);
	const codeLines = submittedCode.split('\n');
	// if (!(codeLines[0].includes('def') || codeLines[0].includes('class') || codeLines[0].includes('import'))) {
	// 	return {
	// 		status: 'fail',
	// 		header: 'Error running tests',
	// 		details: 'First code line must be `def`, `class` or `import` declaration',
	// 	};
	// }

	const linesToPreserve = lines;
	let finalCode = [];
	linesToPreserve.forEach((line) => {
		finalCode.push(line);
	});
	codeLines.forEach((line) => {
		if (line.includes('def ' + testFn)) {
			finalCode.push(line);
			// TODO: make the indentation look nicer here
			finalCode.push('    """\n' + probDescription + '\n"""');
		} else {
			finalCode.push(line);			
		}
	});
	// Redirects stdout so we can return it
	finalCode.push('import sys');
	finalCode.push('import io');
	finalCode.push('sys.stdout = io.StringIO()');
	// Runs the doctests
	finalCode.push('import doctest');
	finalCode.push('doctest.testmod(verbose=True)');
	finalCode = finalCode.join('\n');

	//console.log("Final Code\n" + finalCode)

	return {
		status: 'success',
		header: 'Running tests...',
		code: finalCode,
		startLine: startLine,
	};
}

export function processTestResults(outputStr) {
	const summaryRe = /(\d+)\spassed\sand\s(\d+)\sfailed./;
	const summaryMatches = outputStr.match(summaryRe);
	if (summaryMatches) {
		const successCount = parseInt(summaryMatches[1], 10);
		const failCount = parseInt(summaryMatches[2], 10);
		const totalCount = successCount + failCount;
		const doctestResults = cleanupDoctestResults(outputStr);
		return {
			status: successCount == totalCount ? 'pass' : 'fail',
			header: `${successCount} of ${totalCount} tests passed`,
			details: doctestResults,
		};
	}
}

export function processTestError(error, startLine) {
	if (error.message.startsWith('Traceback')) {
		return {
			status: 'fail',
			header: 'Syntax error',
			details: extractError(error.message, startLine),
		};
	} else if (error.message == 'Infinite loop') {
		return {
			status: 'fail',
			header: 'Infinite loop',
			details:
				'Your code did not finish executing within 5 seconds. Please look to see if you accidentally coded an infinite loop.',
		};
	}
	return {
		status: 'fail',
		header: 'Unexpected error occurred',
	};
}
