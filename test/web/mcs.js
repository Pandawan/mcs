(function() {


	var mcs = (function() {
		let chalk;

		/*
		* Obj: String with function/commands to minify
		* Options:
		*   - Obfuscate: Whether or not to obfuscate every function name, scoreboard, and tag
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


			var result = {

			};

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
					let line = array[lineNumber].trim().replace(/[;]$/, '');
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
							// Check that it's a valid line
							if (exe[1] && exe[2] === '=' && typeof exe[3] === 'string') { // TODO: Check that it's a valid scoreboard type
							// Make sure we're not using a variable that already exists
							if (database.variables[exe[1]]) {
								throwErr('Variable ' + exe[1] + ' is already defined', lineNumber);
							}
							debug('Create Variable node ' + exe[1] + ' ' + currentNode, lineNumber);
							// Push new node data
							pushNewNode({ type: 'createvar', name: exe[1], value: exe[3]}, false);
							database.variables[exe[1]] = currentNode;
						} else {
							throwErr('Variable is defined incorrectly', lineNumber);
						}
					}
					// Other
					else {
						var items = line.split(' ').splice(0);
						var funcCall = /([a-z]+)\((([a-z]*(?:, ?)?)*)\)/.exec(line);

						// Variable Set - [name] [entity selector] = [value]
						if (database.variables[items[0]] && items[1] && items[2] === '=' && !isNaN(items[3])) {
							debug('Set Variable node ' + items[0] + ' ' + currentNode, lineNumber);
							// Push new node data
							pushNewNode({ type: 'setvar', selector: items[0], value: parseFloat(items[3])}, false);
						}
						// Calling a function [name]([parameters...])
						else if (funcCall) {
							debug('Function Call node ' + funcCall[1] + ' ' + currentNode, lineNumber);
							pushNewNode({ type: 'call', function: funcCall[1], parameters: funcCall[2].replace(' ', '') }, false)
						}
					}
				} else {
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
							database.node[lastNode] = { type: 'function', name: fn[1], node: {} };
						} else {
							throwErr('Function is not defined correctly', lineNumber);
						}
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
							currentPre.push(pre)
						}
						else if (node.type === 'createvar') {
							final[currentFile] += allCurrentPre() + 'scoreboard objectives add ' + node.name + ' ' + node.value + '\n';
						}
						else if (node.type === 'setvar') {
							final[currentFile] += allCurrentPre() + 'scoreboard players set ' + node.selector + ' ' + node.value + '\n';
						}
						else if (node.type === 'call') {
							final[currentFile] += allCurrentPre() + 'call ' + node.function + '(' + node.parameters + ')\n';
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

			function getCurrentPre() {
				var arr = [];
				for (var num in currentPre) {
					var pre = currentPre[num];
					if (currentNode.indexOf(pre.pos) == 0) arr.push(pre.value);
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

			function goToNextParent(pop) {
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
			throw new Error(err);
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

		let tokens = lexer();
		var output = parser(tokens);

		return output;
	};

	mcs.help = function help() {
		console.log([
			'mcs',
			'A Minecraft Scripting language which converts to functions'
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
