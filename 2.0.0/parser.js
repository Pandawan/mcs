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
V - binary math
V - bools and strings
V - return
V - basic commands
V - if elseif else
X - for loops
V - macro run call (run macro())
V - macro
V - basic Functions
X - namespaces
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
	var keywords = " function if elseif else return execute true false var for macro run ";
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
	function read_string() {
		return { type: "str", value: read_escaped('"') };
	}
	function read_comment() {
		var output = read_while(function(ch){ return ch != "\n" });
		return { type: "comment", value: output };
	}
	function skip_comment() {
		read_while(function(ch){ return ch != "\n" });
		input.next();
	}
	function check_comment() {
		var output = read_while(function(ch){ return ch == "/"});
		if (output == '//'){
			skip_comment();
		}
		else {
			input.next();
		}
	}
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
	function parse_run() {
		input.next();
		return parse_expression();
	}
	function parse_varname() {
		var name = input.next();
		if (name.type != "reg") input.croak("Expecting variable name");
		return name.value;
	}
	function parse_if() {
		skip_kw("if");
		var cond = delimited("(", ")", ",", parse_expression);
		var then = parse_expression();
		var ret = {
			type: "if",
			cond: cond,
			then: then,
		};

		ret.elseif = [];

		while (is_kw("elseif")) {
			input.next();
			var newElseIf = {
				type: 'elseif',
				cond: delimited("(", ")", ",", parse_expression),
				then: parse_expression()
			}
			ret.elseif.push(newElseIf);
		}
		if (is_kw("else")) {
			input.next();
			ret.else = parse_expression();
		}
		return ret;
	}
	function parse_var() {
		skip_kw("var");
		return { type: 'var', value: parse_varname() };
	}
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
	// Macros
	function parse_macro() {
		return {
			type: "macro",
			name: input.next().value,
			vars: delimited("(", ")", ",", parse_varname),
			body: parse_expression()
		};
	}
	function parse_bool() {
		return {
			type  : "bool",
			value : input.next().value == "true"
		};
	}
	function parse_return() {
		input.next();
		return {
			type: "return",
			value: parse_expression()
		};
	}
	function parse_comment() {
		return {
			type  : "comment",
			value : input.next().value
		};
	}
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
			// If the last one was run, then it's a run call
			if (input.last() && (input.last().value == 'run' || input.last().value == '(')) return input.next();
			unexpected();
		}
	}
	function maybe_call(expr) {
		expr = expr();
		return is_punc("(") ? parse_call(expr) : expr;
	}
	// Parses through anything
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
			if (is_kw("run")) return parse_run();

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
	function parse_toplevel() {
		var prog = [];
		while (!input.eof()) {
			prog.push(parse_expression());
			if (is_comment()) prog.push(parse_comment());
			else if (!input.eof() && (!input.last() || (input.last() && input.last().type != "comment"))) skip_punc(";");
		}
		return { type: "prog", prog: prog };
	}
	function parse_prog() {
		var prog = delimited("{", "}", ";", parse_expression);
		if (prog.length == 0) return FALSE;
		if (prog.length == 1) return prog[0];
		return { type: "prog", prog: prog };
	}
	function parse_expression() {
		return maybe_call(function(){
			return maybe_binary(parse_atom(), 0);
		});
	}
}







var input = [
	'# Comm',
	'// Comment',
	'# dwagkdwjak',
	'var hey = 1;',
	'1 + 1;',
	'return $hey;',
	'say $hey Hello World;',
	'macro hi (hey) { };',
	'var awdadwa = 10;',
	'# yet another comment',
	'function hello { };',
	'var awd1 = 10;',
	'run foo(a,1);',
	'if (hey) { } elseif () { } elseif () {} else { }'
].join('\n');

var token = Parser(TokenStream(InputStream(input)));

console.log(JSON.stringify(token, null, '\t'));
