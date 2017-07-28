/* WIP Advanced Parser
I don't know if I'll actually use it, I'm trying things out and testing things.
This should be a much more advanced parser...
InputStream reads characters
TokenStream is the lexer (converts everything into tokens)
Parser tries to create node structures out of the tokens

Once that is done, need a compiler which uses all the tokens and converts everything into MCFunction files

Parser based on: http://lisperator.net/pltut/


Current Progress:

V - # comments
V - // comments
V - variable assigning
V - binary operations
V - bools and strings
V - return
V - basic commands
V - if elseif else
X - for loops
V - macro calls (macro())
V - macro
V - basic Functions
X - namespaces
X - Arrays
V - evaluation blocks
*/

// List of all commands that exist in mc
var availableCommands = ["advancement", "ban", "blockdata", "clear", "clone", "debug", "defaultgamemode", "deop", "difficulty", "effect", "enchant", "entitydata", "execute", "fill", "function", "gamemode", "gamerule", "give", "help", "kick", "kill", "list", "locate", "me", "op", "pardon", "particle", "playsound", "publish", "recipe", "reload",  "replaceitem", "save", "say", "scoreboard", "seed", "setblock", "setidletimeout", "setmaxplayers", "setworldspawn", "spawnpoint", "spreadplayers", "stats", "stop", "stopsound", "summon", "teleport", "tell", "tellraw", "testfor", "testforblock", "testforblocks", "time", "title", "toggledownfall", "tp", "transferserver", "trigger", "weather", "whitelist", "worldborder", "wsserver", "xp"];

// InputStream (Read input character by character)
function InputStream(input) {
	var pos = 0, line = 1, col = 0, lastVal = null;
	return {
		next  : next,
		peek  : peek,
		eof   : eof,
		croak : croak,
		last  : last
	};
	function next() {
		lastVal = peek();
		var ch = input.charAt(pos++);
		if (ch == "\n") line++, col = 0; else col++;
		return ch;
	}
	function last() {
		return lastVal;
	}
	function peek() {
		return input.charAt(pos);
	}
	function eof() {
		return peek() == "";
	}
	function croak(msg) {
		var err = msg + ' at (' + line + ':' + col + ')';
		console.error(err);
		throw new Error(err);
	}
}

// Lexer (converts everything into tokens)
function TokenStream(input) {
	var current = null;
	// List of all keywords that are available
	var keywords = " function if elseif else return execute true false var for macro ";
	var lastVal = null;
	return {
		next  : next,
		peek  : peek,
		eof   : eof,
		croak : input.croak,
		last  : last
	};
	function is_keyword(x) {
		return keywords.indexOf(" " + x + " ") >= 0;
	}
	function is_digit(ch) {
		return /[0-9]/i.test(ch);
	}
	function is_id_start(ch) {
		return /[a-z0-9-_\$]/i.test(ch);
	}
	function is_id(ch) {
		return is_id_start(ch);
	}
	function is_ivar(ch) {
		return /\$[a-z0-9-_]/i.test(ch);
	}
	function is_op_char(ch) {
		return "+-*/%=&|<>!".indexOf(ch) >= 0;
	}
	function is_punc(ch) {
		return ",;(){}[]".indexOf(ch) >= 0;
	}
	function is_whitespace(ch) {
		return " \t\n".indexOf(ch) >= 0;
	}
	// Read until the given predicate returns false
	function read_while(predicate) {
		var str = "";
		while (!input.eof() && predicate(input.peek()))
		str += input.next();
		return str;
	}
	function read_number() {
		var has_dot = false;
		var number = read_while(function(ch){
			if (ch == ".") {
				if (has_dot) return false;
				has_dot = true;
				return true;
			}
			return is_digit(ch);
		});
		return { type: "num", value: parseFloat(number) };
	}
	// Read identifiers, can return a keyword, an ivar ($variable), or reg (anything else)
	function read_ident() {
		var id = read_while(is_id);

		var type;
		if (is_keyword(id)) type = "kw";
		else if (is_ivar(id)) type = "ivar"
		else type = "reg";

		return {
			type  : type,
			value : id
		};
	}
	function read_escaped(end) {
		var escaped = false, str = "";
		input.next();
		while (!input.eof()) {
			var ch = input.next();
			if (escaped) {
				str += ch;
				escaped = false;
			} else if (ch == "\\") {
				escaped = true;
			} else if (ch == end) {
				break;
			} else {
				str += ch;
			}
		}
		return str;
	}
	/* Evaluation blocks
	Inside a string, content inside `` will be parsed as if it was normal syntax.
	This allows for easier variable/macro integration: "math result: `math(1,2) + 2`" rather than "math result: " + (math(1,2) + 2)
	(Although the second option is still available if you need it).
	*/
	function read_evaled(val) {
		// Don't do it if it doesn't need evaluation
		if (val.indexOf("`") >= 0){

			var eval = false, final = [], str = "";
			var arr = val.split('');

			for (var i = 0; i < arr.length; i++) {
				var ch = arr[i];

				// Currently in an eval block
				if (eval) {
					if (ch == '`'){
						eval = false;
						// Parse the whole thing as if it was a full code block
						var parsedEval = Parser(TokenStream(InputStream(str)));
						console.log(parsedEval);
						if (parsedEval.prog.length != 0) {
							for (var x = 0; x < parsedEval.prog.length; x++) {
								if (parsedEval.prog[x].type == "comment") {
									input.croak("Comments are not allowed in evaluation blocks");
								}
								else if (parsedEval.prog[x].type == "function") {
									input.croak("Functions are not allowed in evaluation blocks");
								}
								else if (parsedEval.prog[x].type == "macro") {
									input.croak("Creating macros is not allowed in evaluation blocks");
								}
							}
							final.push(parsedEval);
						}
						str = "";
					} else {
						str += ch;

						if (i == arr.length - 1) {
							if (str) final.push({ type: "str", value: str });
						}
					}
				}
				// Don't eval
				else {
					if (ch == '`'){
						eval = true;
						if (str) final.push({ type: "str", value: str });
						str = "";
					}
					else {
						str += ch;
						if (i == arr.length - 1) {
							if (str) final.push({ type: "str", value: str });
						}
					}
				}
			}
			return final;
		} else {
			return val;
		}
	}
	function read_string() {
		return { type: "str", value: read_evaled(read_escaped('"')) };
	}
	// Read comments that need to be added (#)
	function read_comment() {
		var output = read_while(function(ch){ return ch != "\n" });
		return { type: "comment", value: output };
	}
	function skip_comment() {
		read_while(function(ch){ return ch != "\n" });
		input.next();
	}
	// Check whether or not the line is a // comment, skip it if so
	function check_comment() {
		var output = read_while(function(ch){ return ch == "/"});
		if (output == '//'){
			skip_comment();
		}
		else {
			input.next();
		}
	}
	// Read the next character, assign tokens
	function read_next() {
		read_while(is_whitespace);
		if (input.eof()) return null;
		var ch = input.peek();
		if (ch == "#") {
			return read_comment();
		}
		if (ch == "/") {
			check_comment();
			return read_next();
		}
		if (ch == '"') return read_string();
		if (is_digit(ch)) return read_number();
		if (is_id_start(ch)) return read_ident();
		if (is_punc(ch)) return {
			type  : "punc",
			value : input.next()
		};
		if (is_op_char(ch)) return {
			type  : "op",
			value : read_while(is_op_char)
		};
		input.croak("Can't handle character: " + ch);
	}
	function peek() {
		return current || (current = read_next());
	}
	function last() {
		return lastVal;
	}
	function next() {
		lastVal = peek();
		var tok = current;
		current = null;
		return tok || read_next();
	}
	function eof() {
		return peek() == null;
	}
}

// Parser (actually parses data)
var FALSE = { type: "bool", value: false };
function Parser(input) {
	// Order of math operations, greater means included first
	var PRECEDENCE = {
		"=": 1,
		"||": 2,
		"&&": 3,
		"<": 7, ">": 7, "<=": 7, ">=": 7, "==": 7, "!=": 7,
		"+": 10, "-": 10,
		"*": 20, "/": 20, "%": 20,
	};
	return parse_toplevel();
	function is_punc(ch) {
		var tok = input.peek();
		return tok && tok.type == "punc" && (!ch || tok.value == ch) && tok;
	}
	function is_kw(kw) {
		var tok = input.peek();
		return tok && tok.type == "kw" && (!kw || tok.value == kw) && tok;
	}
	function is_op(op) {
		var tok = input.peek();
		return tok && tok.type == "op" && (!op || tok.value == op) && tok;
	}
	function is_comment() {
		var tok = input.peek();
		return tok && tok.type == "comment";
	}
	function is_reg() {
		var tok = input.peek();
		return tok && tok.type == "reg";
	}
	function skip_punc(ch) {
		if (is_punc(ch)) input.next();
		else input.croak("Expecting punctuation: \"" + ch + "\"");
	}
	function skip_comment(ch) {
		if (is_comment()) parse_comment();
		input.next();
	}
	function skip_kw(kw) {
		if (is_kw(kw)) input.next();
		else input.croak("Expecting keyword: \"" + kw + "\"");
	}
	function skip_op(op) {
		if (is_op(op)) input.next();
		else input.croak("Expecting operator: \"" + op + "\"");
	}
	function unexpected() {
		input.croak("Unexpected token: " + JSON.stringify(input.peek()));
	}
	// Check whether or not to parse this through binary operations
	function maybe_binary(left, my_prec) {
		var tok = is_op();
		if (tok) {
			var his_prec = PRECEDENCE[tok.value];
			if (his_prec > my_prec) {
				input.next();
				return maybe_binary({
					type     : tok.value == "=" ? "assign" : "binary",
					operator : tok.value,
					left     : left,
					right    : maybe_binary(parse_atom(), his_prec)
				}, my_prec);
			}
		}
		return left;
	}
	// Parses through anything between start and stop, with separator, using the given parser
	function delimited(start, stop, separator, parser) {
		var a = [], first = true;
		skip_punc(start);
		while (!input.eof()) {
			if (is_punc(stop)) break;
			if (first) first = false; else skip_punc(separator);
			if (is_punc(stop)) break;
			a.push(parser());
		}
		skip_punc(stop);
		return a;
	}
	function parse_call(func) {
		return {
			type: "call",
			func: func,
			args: delimited("(", ")", ",", parse_expression),
		};
	}
	// Variable names can't be ivar nor keyword, check that it's a reg
	function parse_varname() {
		var name = input.next();
		if (name.type != "ivar") input.croak("Expecting variable name");
		return name.value;
	}
	// Parse if statements, add elseif if there are some, and add else if there is one
	function parse_if() {
		skip_kw("if");
		var cond = delimited("(", ")", ",", parse_expression);
		var then = parse_expression();
		var ret = {
			type: "if",
			cond: cond,
			then: then,
		};
		if (is_kw("else")) {
			input.next();
			ret.else = parse_expression();
		}
		return ret;
	}
	// Parse a var declaration
	function parse_var() {
		skip_kw("var");
		return { type: 'var', value: parse_varname() };
	}
	// WIP - Parse a for loop
	function parse_for() {
		input.croak("For loops are currently not supported");
		skip_kw("for");
		var params = delimited("(", ")", ";", parse_expression);
		var then = parse_expression();
		var ret = {
			type: "for",
			params: params,
			then: then,
		};
		return ret;
	}
	/* Parse a function
	This can be taken in two ways:
	1. actual function declaration ( function name { } )
	2. minecraft function command ( function name [if/unless...] )

	Therefore, testing if there are reg arguments following it, if so, it's Option 2.
	*/
	function parse_function() {
		// Skip the function keyword
		input.next();
		// Get the name of the function
		var name = input.next().value;
		// Check if what's afterwards is a call
		if (is_punc(';') || is_reg()) {
			var obj = {
				type: "command",
				value: [
					{ type: "reg", value: "function" }
				]
			};
			// Loop through it to add all of the arguments
			while (!input.eof()) {
				console.log(input.peek());
				obj.value.push(input.next());

				if (is_punc(';')) break;
				else if (input.eof()) skip_punc(';');
			}
			return obj;
		}
		// It's not a call to a function, parse it as a normal function
		return {
			type: "function",
			name: name,
			body: parse_expression()
		};
	}
	// Parse a macro, basically a function with parameters
	function parse_macro() {
		return {
			type: "macro",
			name: input.next().value,
			vars: delimited("(", ")", ",", parse_varname),
			body: parse_expression()
		};
	}
	// Return statements
	function parse_return() {
		input.next();
		return {
			type: "return",
			value: parse_expression()
		};
	}
	// Bool just checks if the value is "true"
	function parse_bool() {
		return {
			type  : "bool",
			value : input.next().value == "true"
		};
	}
	// Parsing a comment as an actual comment
	function parse_comment() {
		return {
			type  : "comment",
			value : input.next().value
		};
	}
	/* Parsing reg is complicated

	Most of the time, a reg is simply a minecraft command and its arguments, it checks if it's an actual command, and if so, it returns the full command
	Sometimes, it's the name of a macro or other function calling, if so return the exact token
	If it's neither of those, then it's unexpected
	*/
	function parse_reg() {
		// Regs are commands and command arguments
		var final = { type: "command", value: [] };
		if (availableCommands.includes(input.peek().value)) {

			while (!input.eof()) {
				final.value.push(input.next());

				if (is_punc(';')) break;
				else if (input.eof()) skip_punc(';');
			}
			return final;
		} else {
			return input.next();
			//unexpected();
		}
	}
	function maybe_call(expr) {
		expr = expr();
		return is_punc("(") ? parse_call(expr) : expr;
	}
	// Major parser, checks what the token is an tells it to how to parse it
	function parse_atom() {
		return maybe_call(function(){
			if (is_punc("(")) {
				input.next();
				var exp = parse_expression();
				skip_punc(")");
				return exp;
			}
			if (is_punc("{")) return parse_prog();
			if (is_kw("if")) return parse_if();
			if (is_kw("var")) return parse_var();
			if (is_kw("true") || is_kw("false")) return parse_bool();
			if (is_kw("for")) return parse_for();
			if (is_kw("function")) return parse_function();

			// TODO: Parse Macro
			if (is_kw("macro")) {
				input.next();
				return parse_macro();
			}
			if (is_kw("return")) return parse_return();
			if (is_comment()) return parse_comment();
			if (input.peek().type == 'reg') return parse_reg();

			var tok = input.next();
			if (tok.type == "ivar" || tok.type == "num" || tok.type == "str")
			return tok;
			unexpected();
		});
	}
	// Parsing a program/top level
	function parse_toplevel() {
		var prog = [];
		while (!input.eof()) {
			prog.push(parse_expression());

			// Comments are special because they don't require a ; at the end, so we need to check that it's not a comment
			if (is_comment()) prog.push(parse_comment());
			else if (!input.eof() && (!input.last() || (input.last() && input.last().type != "comment"))) skip_punc(";");
		}
		return { type: "prog", prog: prog };
	}
	// Parse through a full program
	function parse_prog() {
		var prog = delimited("{", "}", ";", parse_expression);
		if (prog.length == 0) return FALSE;
		if (prog.length == 1) return prog[0];
		return { type: "prog", prog: prog };
	}
	// Parse through everything, parse binary and calls just in case
	function parse_expression() {
		return maybe_call(function(){
			return maybe_binary(parse_atom(), 0);
		});
	}
}


// Input for now (too lazy to use a text file)

var input = [
	'# Comm',
	'// Comment',
	'# dwagkdwjak',
	'var $hey = 1;',
	'1 + 1;',
	'return $hey;',
	'say $hey Hello World;',
	'macro hi ($hey) { say hey; return $hey; };',
	'var $awdadwa = 10;',
	'# yet another comment',
	'function hello { };',
	'var $awd1 = 10;',
	'foo($a,$as);',
	'var $heyyy = $hey + "test";',
	'if ($hey) { } else if ($hey) { } else if ($hey) { } else { };',
	'var $evaledString = "something `1 + 2` is a number";'
].join('\n');


// Tokenize the **** out of this
var token = Parser(TokenStream(InputStream(input)));

// What did we get? Also, its pretty!
console.log(JSON.stringify(token, null, '\t'));
