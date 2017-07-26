(function() {


	var mcs = (function() {
		let chalk;

		/*
		* Obj: String with function/commands to minify
		* Returns:
		*   - Array of Objects:
		*        - Name: Name of Function file
		*        - Content: Content of Function file
		*/
		var mcs = function(obj, options) {
			// Check that given object is not null
			if (!obj || typeof obj !== 'string') {
				let error = 'Error: Object to parse is not a valid string or does not exist.';
				console.error(error);
				return error;
			}

			/* LEXER */
			function lexer () {
				debug('--- Running LEXER ---\n');
				// Keep database of tokens from lexer
				var database = {
					variables: {

					},
					functions: {

					},
					node: {

					}
				};
				var currentNode = '0';

				// Split file into lines
				let array = obj.toString().split("\n");
				if(obj.toString().includes("\r")) {
					array = obj.toString().split("\r\n");
				}

				// Lexer logic
				for(var lineNumber in array) {
					// Get the line
					let line = array[lineNumber].trim().replace(/[;]$/, '');

					/* Block dependent statements */
					// Check that we are not at the outermost layer
					if (currentNode != '0') {
						// If it's a } close out of the node
						if (line.startsWith('}')) {
							var arr = currentNode.split(' ');
							arr.pop();
							debug('Exiting node ' + currentNode + ' to ' + arr.join(' '), lineNumber);
							currentNode = arr.join(' ');
							// If we've reached the outermost layer, set it back to 0
							if (!currentNode) {
								currentNode = '0';
							}
						}
						// Comment starting with #
						else if (line.startsWith('#')) {
							var goodComment = line.replace('#', '');
							debug('Comment node ' + goodComment, lineNumber);
							pushNewNode({ type: 'comment', value: goodComment}, false);
						}
						// Execute - execute [entity selector] [coords] { ... }
						else if (line.startsWith('execute')) {
							var exe = line.split(' ').splice(0);
							// Check that it's a valid line
							if (exe[1] && exe[2] && exe[3] && exe[4] && exe[5] === '{') {
								debug('Execute node ' + exe[1] + ' at ' + currentNode, lineNumber);
								// Push new node data
								pushNewNode({ type: 'execute', selector: exe[1], relative: exe[2] + ' ' + exe[3] + ' ' + exe[4], node: {} }, true);
							} else {
								throwErr('Execute is used incorrectly', lineNumber);
							}
						}
						// Variable - var [name] = [type]
						else if (line.startsWith('var')) {
							var exe = line.split(' ').splice(0);
							var val = line.split(' ').slice(3).join(' ').trim();
							// Check that it's a valid line
							if (exe[1] && exe[2] === '=' && val) {
								// Make sure we're not using a variable that already exists
								if (database.variables[exe[1]]) {
									throwErr('Variable ' + exe[1] + ' is already defined', lineNumber);
								}
								debug('Create Variable node ' + exe[1] + ' ' + currentNode, lineNumber);
								// Push new node data
								pushNewNode({ type: 'createvar', name: exe[1], value: val}, false);
								database.variables[exe[1]] = currentNode;
							}
							else {
								throwErr('Variable is defined incorrectly', lineNumber);
							}
						}
						// Variable Set - $[name] = [value]
						else if (line.startsWith('$')) {
							var items = line.split(' ').splice(0);
							var val = line.split(' ').slice(2).join(' ').trim();

							var varName = items[0].replace('$', '');

							if (items[1] === '=' && val) {
								if (database.variables[varName]) {
									debug('Set Variable node ' + items[0] + ' ' + currentNode, lineNumber);
									// Push new node data
									pushNewNode({ type: 'setvar', name: varName, value: val}, false);
								}else {
									throwErr('No variable found with the name ' + varName, lineNumber);
								}
							} else {
								throwErr('Trying to modify variable incorrectly', lineNumber);
							}
						}
						// Other
						else {
							// Putting function calls in other because I need to declare this variable.
							var funcCall = /([a-z]+)\((([$a-z]*(?:, ?)?)*)\)/.exec(line);

							// Calling a function [name]([parameters...])
							if (funcCall) {
								if (database.functions[funcCall[1]]) {
									debug('Function Call node ' + funcCall[1] + ' ' + currentNode, lineNumber);
									pushNewNode({ type: 'call', function: funcCall[1], parameters: funcCall[2].replace(' ', '') }, false);
								} else {
									throwErr('No function found with the name \"' + funcCall[1] + '\"', lineNumber);
								}
							}
							// Any other line (don't parse //comments )
							else if (line && !line.startsWith('//')){
								debug('Other node ' + line, lineNumber);
								pushNewNode({ type: 'other', value: line}, false);
							}
						}
					}
					/* Root statements only */
					else {
						// Function - function [name] { ... }
						if (line.startsWith('function')) {
							var fn = line.split(' ').splice(0);
							// Check that it's a valid line
							if (fn[1] && fn[2] === '{') {
								// Get the next node number/id for functions at root
								var lastNode = Object.keys(database.node).length + 1;
								debug('Adding function ' + fn[1] + ' with node ' + lastNode, lineNumber);
								currentNode = lastNode.toString();
								// Add the function node to the root
								database.functions[fn[1]] = currentNode;
								//pushNewNode({ type: 'function', name: fn[1], node: {} }, true);
								database.node[lastNode] = { type: 'function', name: fn[1], node: {} };
							} else {
								throwErr('Function is not defined correctly', lineNumber);
							}
						}
						// Variable - var [name] = [type]
						else if (line.startsWith('var')) {
							var exe = line.split(' ').splice(0);
							var val = line.split(' ').slice(3).join(' ').trim();
							// Check that it's a valid line
							if (exe[1] && exe[2] === '=' && val) {
								// Make sure we're not using a variable that already exists
								if (database.variables[exe[1]]) {
									throwErr('Variable ' + exe[1] + ' is already defined', lineNumber);
								}
								debug('Create Variable node ' + exe[1] + ' ' + currentNode, lineNumber);
								// Push new node data
								var lastNode = Object.keys(database.node).length + 1;
								database.node[lastNode] = { type: 'createvar', name: exe[1], value: val };
								//pushNewNode({ type: 'createvar', name: exe[1], value: val}, false);
								database.variables[exe[1]] = lastNode.toString();
							}
							else {
								throwErr('Variable is defined incorrectly', lineNumber);
							}
						}
						// Variable Set - $[name] = [value]
						else if (line.startsWith('$')) {
							var items = line.split(' ').splice(0);
							var val = line.split(' ').slice(2).join(' ').trim();

							var varName = items[0].replace('$', '');

							if (items[1] === '=' && val) {
								if (database.variables[varName]) {
									debug('Set Variable node ' + items[0] + ' ' + currentNode, lineNumber);
									// Push new node data

									var lastNode = Object.keys(database.node).length + 1;
									database.node[lastNode] = { type: 'setvar', name: varName, value: val };
									//pushNewNode({ type: 'setvar', name: varName, value: val}, false);
								}else {
									throwErr('No variable found with the name ' + varName, lineNumber);
								}
							} else {
								throwErr('Trying to modify variable incorrectly', lineNumber);
							}
						}
						// Comment starting with #
						else if (line.startsWith('#')) {
							throwErr('\"#\" comment must be inside a function.', lineNumber);
						}
						// Any other line (don't parse // comments )
						else if (line && !line.startsWith('//')) {
							throwErr('Unsupported root statement, must be a variable or a function', lineNumber);
						}
					}
				}

				return database;


				function pushNewNode(obj, addNode) {
					// Get the current node and push the new command
					var n = getRecursiveNode(currentNode, database);
					var lastNode = Object.keys(n.node).length + 1;
					n.node[lastNode] = obj;
					if (addNode)
					currentNode += ' ' + lastNode;
				}
			}

			function parser (tokens) {
				debug('--- Running PARSER ---\n');
				var final = {

				};
				var lastNode = Object.keys(tokens.node).length.toString();

				var currentNode = '1';
				var currentFile = '';
				var currentPre = [
				];
				var currentVars = [

				];

				if (tokens && tokens.node) {
					// Loop until we've reached the end
					while(currentNode.charAt(0) <= lastNode.charAt(0)) {
						// Get current node
						var node = getRecursiveNode(currentNode, tokens);
						// If it doesn't exist, go to the next parent node
						if (!node) {
							goToNextParent(true);
						}
						else {
							// If the node is a function
							if (node.type === 'function') {
								// Add a new file
								currentFile = node.name + '.mcfunction';
								final[currentFile] = "##### Generated with MinecraftScript (mcs) #####\n";
							}
							// If the node is an execute block
							else if (node.type === 'execute') {
								var pre = {
									pos: currentNode,
									value: 'execute ' + node.selector + ' ' + node.relative + ' '
								}
								// Add it to database of prefixes
								currentPre.push(pre)
							}
							// If node is create variable
							else if (node.type === 'createvar') {
								var v = {
									pos: currentNode.substring(0, currentNode.length - 2),
									name: node.name,
									value: applyVars(node.value)
								};
								// Add it to database of variables
								currentVars.push(v);
							}
							// If we're changing a variable's value
							else if (node.type === 'setvar') {
								// Find that variable's position in array
								var curVar = findWithKeyValue(getCurrentVars(), 'name', node.name);
								// Check that it exists
								if (curVar != -1) {
									var v = {
										pos: currentNode.substring(0, currentNode.length - 2),
										name: currentVars[curVar].name,
										value: applyVars(node.value)
									};
									// Add it to database of variables
									currentVars.push(v);
								} else {
									// Not found
									throwErr('No variable found with the name ' + node.name);
								}
							}
							// Calling another function
							else if (node.type === 'call') {
								addLine(allCurrentPre() + 'function ' + node.function + '\n');
							}
							// Calling another function
							else if (node.type === 'comment') {
								addLine('#' + node.value + '\n');
							}
							else if (node.type === 'other') {
								addLine(allCurrentPre() + node.value + '\n');
							}

							// If the current node has more nodes inside
							if (node.node) {
								currentNode += ' 1';
							} else {
								goToNextParent(false);
							}
						}
					}
				}

				function addLine(line) {
					final[currentFile] += applyVars(line);
				}

				/* Variables */
				function getCurrentVars() {
					var arr = [];
					for(var num in currentVars) {
						var v = currentVars[num];
						if (isInScope(v.pos)) arr.push(v);
					}
					return arr;
				}

				function applyVars(input) {
					var arr = getCurrentVars();
					if (!arr) return input;

					var output = input;
					// Apply the veriables in reverse to work with scope
					for (var i = arr.length -1; i >= 0; i--) {
						var reg = new RegExp(('\$' + arr[i].name).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
						output = output.replace(reg, arr[i].value);
					}
					return output;
				}

				/* Prefixes */
				function getCurrentPre() {
					var arr = [];
					for (var num in currentPre) {
						var pre = currentPre[num];
						if (isInScope(pre.pos)) arr.push(pre.value);
					}
					return arr;
				}

				function allCurrentPre() {
					var arr = getCurrentPre();
					if (arr) {
						return arr.join(' ');
					} else {
						return '';
					}
				}

				/* General Utilities */
				function isInScope (node) {
					return currentNode.indexOf(node) == 0;
				}

				function findWithKeyValue (array, key, value) {
					for (var i in array) {
						if (array[i][key] == value) {
							return i;
						}
					}
					return -1;
				}

				function goToNextParent(pop, node) {
					var arr = currentNode.split(' ');
					if (pop) arr.pop();
					arr[arr.length - 1] = (parseInt(arr[arr.length - 1]) + 1).toString();
					debug('Exiting node ' + currentNode + ' to ' + arr.join(' '));
					currentNode = arr.join(' ');
				}

				return final;
			}

			function getRecursiveNode(index, database) {
				var ind = index.split(' ').splice(0);
				var curr = database;
				for (var i in ind) {
					curr = curr.node[ind[i]];
				}
				return curr;
			}

			function throwErr(msg, lineNumber) {
				var err = msg;
				if (lineNumber) {
					err = msg + ' at (' + ++lineNumber + ')';
				}

				if (chalk) {
					err = chalk.red('Error: ') + err;
				} else {
					err = 'Error: ' + err;
				}

				console.log(err);
				throw new Error(msg);
			}

			function debug(msg, lineNumber) {
				if (options && options.debug) {
					if (lineNumber) {
						console.log(msg + ' at (' + ++lineNumber + ')');
					} else {
						console.log(msg);
					}
				}
			}

			/* Actually run everything */
			let tokens = lexer();
			var output = parser(tokens);

			return output;
		};

		mcs.help = function help() {
			console.log([
				'    mcs',
				'    A Minecraft Scripting language which converts to functions',
				'    ',
				'    Usage:',
				'        var output = mcs(input) - Converts MCS language into object of function files.',
				'    ',
				'    Check repo for more info: https://github.com/PandawanFr/mcs'
			].join('\n'));
		};

		return mcs;
	})();


	/* Browser/AMD/NodeJS handling */
	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		module.exports = mcs;
		chalk = require('chalk');
	} else {
		if (typeof define === 'function' && define.amd) {
			define([], function() {
				return mcs;
			});
		} else {
			window.mcs = mcs;
		}
	}
})();
