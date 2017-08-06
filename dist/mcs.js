/* This will appear at the top/start of the final dist file */
(function() {

    var mcs = (function() {

        var mcs = function(input) {
            if (!input || typeof(input) !== 'string') {
                var err = 'Error: Object to parse is not a valid string or does not exist.';
                console.error(err);
                return err;
            }

            /* Compile the AST into a final JSON object */

            function Compiler(exp) {

                var debug = true,
                    oldDebug = true,
                    addTop = "",
                    inFunc = false,
                    current = [],
                    currentFunc = '',
                    namespace = '',
                    prefix = [];

                // Environment is used to remember/manage the scope
                function Environment(parent) {
                    this.vars = Object.create(parent ? parent.vars : null);
                    this.parent = parent;
                }
                Environment.prototype = {
                    extend: function() {
                        return new Environment(this);
                    },
                    lookup: function(name) {
                        var scope = this;
                        while (scope) {
                            if (Object.prototype.hasOwnProperty.call(scope.vars, name))
                                return scope;
                            scope = scope.parent;
                        }
                    },
                    get: function(name) {
                        if (name in this.vars)
                            return this.vars[name];
                        err("Undefined variable " + name);
                    },
                    set: function(name, value) {
                        var scope = this.lookup(name);
                        // let's not allow defining globals from a nested environment
                        if (!scope && this.parent)
                            err("Undefined variable " + name);
                        return (scope || this).vars[name] = value;
                    },
                    def: function(name, value) {
                        return this.vars[name] = value;
                    }
                };

                // Declare global/root scope
                var env = new Environment();

                var output = {};
                evaluate(exp, env);

                return output;


                // Actual logic

                function err(msg) {
                    if (debug) console.error(msg);
                    throw new Error(msg);
                }

                // Apply operator
                function apply_op(op, a, b) {
                    function num(x) {
                        if (typeof x != "number")
                            err("Expected number but got " + x);
                        return x;
                    }

                    function div(x) {
                        if (num(x) == 0)
                            err("Divide by zero");
                        return x;
                    }
                    switch (op) {
                        case "+":
                            return num(a) + num(b);
                        case "-":
                            return num(a) - num(b);
                        case "*":
                            return num(a) * num(b);
                        case "/":
                            return num(a) / div(b);
                        case "%":
                            return num(a) % div(b);
                        case "&&":
                            return a !== false && b;
                        case "||":
                            return a !== false ? a : b;
                        case "<":
                            return num(a) < num(b);
                        case ">":
                            return num(a) > num(b);
                        case "<=":
                            return num(a) <= num(b);
                        case ">=":
                            return num(a) >= num(b);
                        case "==":
                            return a === b;
                        case "!=":
                            return a !== b;
                    }
                    err("Can't apply operator " + op);
                }
                // Evaluates things quickly
                // Evaluates things normally except that it doesn't return anything except when the return keyword is used.
                // Also evaluates commands differently as they are added to the output
                function quickEvaler(exp, env) {
                    function quickEval(element) {
                        // Don't need to return commands, they get added automatically
                        if (element.type == "command") make_command(env, element);
                        else if (element.type == "return" || element.type == "if") {
                            return evaluate(element, env);
                        } else evaluate(element, env);
                    }

                    // If its more than one line
                    if (exp.type == "prog") {
                        // Loops through every exp
                        for (var i = 0; i < exp.prog.length; i++) {
                            // Get its value, return if needed
                            var x = quickEval(exp.prog[i]);
                            if (x) return x;
                        }
                    }
                    // If its only one line
                    else {
                        // Get its value, return if needed
                        var x = quickEval(exp);
                        if (x) return x;
                    }
                }

                // Create a JS macro to evaluate when called
                function make_macro(env, exp) {
                    if (exp.name == "range") err("Range is a pre-defined macro, please use another name");

                    function macro() {
                        var names = exp.vars;
                        var scope = env.extend();
                        for (var i = 0; i < names.length; ++i)
                            scope.def(names[i], i < arguments.length ? arguments[i] : false);

                        var x = quickEvaler(exp.body, scope);
                        return x;
                    }
                    return env.set(exp.name, macro);
                }

                // Macros have their name as a reg, so need to separate macros from actual regs
                function reg_or_macro(env, exp) {
                    oldDebug = debug;
                    try {
                        debug = false;
                        if (exp.value == "range") return range_macro;
                        var possible = env.get(exp.value);
                        debug = oldDebug;
                        return possible;
                    } catch (e) {
                        debug = oldDebug;
                        return exp.value;
                    }
                }

                // If/else if/else statements
                function make_if(env, exp) {
                    var cond = evaluate(exp.cond, env);
                    if (cond !== false) {
                        var x = quickEvaler(exp.then, env.extend());
                        if (x) return x;
                    } else if (exp.else) {
                        var y = quickEvaler(exp.else, env.extend());
                        if (y) return y;
                    }
                    return false;
                }
                // For loops
                function make_for(env, exp) {
                    // Create a new env
                    var newEnv = env.extend();
                    // Evaluate the first param (declaring variable)
                    evaluate(exp.params[0], newEnv);
                    // While the second param is valid
                    while (evaluate(exp.params[1], newEnv)) {
                        // Evaluate the for content
                        evaluate(exp.then, newEnv);
                        // Evaluate the last param (setting/modifying the variable)
                        evaluate(exp.params[2], newEnv);
                    }
                }
                // Foreach loops
                function make_foreach(env, exp) {
                    // Create a new env
                    var newEnv = env.extend();
                    // Get the array
                    var arr = evaluate(exp.param, env);
                    // Define the variable
                    newEnv.def(exp.variable.value, 0);
                    // Loop through all of them
                    for (var i = 0; i < arr.length; i++) {
                        // Set the variable to the correct value
                        newEnv.set(exp.variable.value, arr[i]);
                        // Evaluate
                        evaluate(exp.then, newEnv);
                    }
                }
                // Execute blocks
                function make_execute(env, exp) {
                    // Add prefix
                    prefix.push("execute " + exp.selector.value + " " + exp.pos[0].value + " " + exp.pos[1].value + " " + exp.pos[2].value + " ");
                    // Evaluate content
                    evaluate(exp.prog, env.extend());
                    // pop
                    prefix.pop();
                }
                // Strings can also have evals inside them
                function make_string(env, exp) {
                    // If it's an array, then it contains evals
                    if (Array.isArray(exp.value)) {
                        var final = "";
                        for (var i = 0; i < exp.value.length; i++) {
                            if (exp.value[i].type == "prog") {
                                var x = evaluate(exp.value[i], env.extend());
                                final += x;
                            } else final += exp.value[i].value;
                        }
                        return final;
                    }
                    // If it's a basic string
                    else {
                        return exp.value;
                    }
                }

                // Create an array
                function make_array(env, exp) {
                    var arr = {};
                    var index = 0;
                    exp.value.forEach(function(element) {
                        var obj = evaluate(element, env);
                        arr[index] = obj;
                        index++;
                    });
                    return arr;
                }
                // Get the ivar's value
                function get_ivar(env, exp) {
                    var ivar = env.get(exp.value);
                    if (exp.index) {
                        var index = evaluate(exp.index, env);
                        if (typeof(index) != "number") err("Array index must be a number");
                        return ivar[index];
                    } else return ivar;
                }
                // Assign can either be a declaration or a modification
                function make_assign(env, exp) {
                    // Modify a current variable, use set
                    if (exp.left.type == "ivar") return env.set(exp.left.value, evaluate(exp.right, env));
                    // Declare a new variable, define (def)
                    else if (exp.left.type == "var") {
                        return env.def(exp.left.value, evaluate(exp.right, env));
                    }
                }
                // Need to compile JSON the way that MC would accept it
                function make_json(env, exp) {
                    var json = "{";
                    for (var i = 0; i < exp.value.length; i++) {
                        var jsonToAdd = "";
                        // if it's a string, add quotes around it
                        if (exp.value[i].type == "str") {
                            jsonToAdd = "\"" + evaluate(exp.value[i], env) + "\"";
                        }
                        // If it's an array, JSONinfy it
                        else if (exp.value[i].type == "array") {
                            var temp = evaluate(exp.value[i], env);
                            jsonToAdd = JSON.stringify(Object.keys(temp).map(function(k) {
                                return temp[k];
                            }));
                        }
                        // if it's something else, evaluate it, it might be something interesting
                        else {
                            jsonToAdd = evaluate(exp.value[i], env);
                        }
                        json += jsonToAdd;
                    }
                    json += "}";
                    return json;
                }
                // Create a comment and add it
                function make_comment(env, exp) {
                    addToOutput(currentFunc, exp.value + "\n");
                }
                // Create a command
                function make_command(env, exp) {
                    var cmd = "";
                    if (env.parent == null) err("Commands cannot be used in root");
                    for (var i = 0; i < exp.value.length; i++) {
                        if (i > 0) {
                            // Don't want to add a space between colons
                            if ((exp.value[i + 1] && exp.value[i + 1].type != "colon") || (exp.value[i - 1] && exp.value[i - 1].type != "colon"))
                                cmd += " ";
                        }
                        cmd += evaluate(exp.value[i], env);
                    }
                    // Whenever a command is read, add it to the output
                    var prefixToAdd = (prefix && prefix.length > 0) ? prefix.join('') : '';
                    addToOutput(currentFunc, prefixToAdd + cmd + "\n");
                    return cmd;
                }
                // Programs are anything inside a {} with more than one statement
                function make_prog(env, exp) {
                    var final = "";
                    exp.prog.forEach(function(exp) {
                        if (exp.type == "command") {
                            var cmd = evaluate(exp, env);
                            final += cmd + "\n";
                        }
                        // Need to add returned items because of eval blocks
                        else if (exp.type == "return") {
                            var output = evaluate(exp, env);
                            final += output;
                        } else evaluate(exp, env);
                    });
                    return final;
                }
                // Make a function, evaluate, get out of function
                function make_func(env, exp) {
                    inFunc = true;
                    currentFunc = exp.name;
                    evaluate(exp.body, env.extend());
                    // No need to add anything to the output here, whenever a command is found, it adds it when read
                    currentFunc = '';
                    inFunc = false;
                }
                // Make a group, evaluate inside, get out of group
                function make_group(env, exp) {
                    if (inFunc) err("Groups cannot be inside functions");
                    current.push(exp.name);
                    evaluate(exp.body, env.extend());
                    current.pop();
                }

                function make_setting(env, exp) {
                    if (env.parent != null) err("Settings must be declared in the root");
                    if (exp.name == "namespace") {
                        if (namespace && namespace != "namespace") err("Cannot declare namespace more than once");
                        if (namespace && namespace == "_namespace") err("Please declare the namespace BEFORE writing any functions");
                        namespace = exp.value;
                    } else {
                        err("No setting found with the name " + exp.name);
                    }
                }

                // Add the given key-value pair to the output
                function addToOutput(name, value) {

                    // We need the namespace now, if it doesn't exist, set it! (Use _namespace so that there's less chance of conflict)
                    if (!namespace) namespace = "_namespace";
                    if (!output[namespace]) output[namespace] = {
                        _type: "namespace"
                    };
                    // Get the current position to setup our group
                    var curOutput = output[namespace];

                    // Check whether or not we are in a group
                    if (current) {
                        // Get the current group
                        current.forEach(function(element) {
                            if (!curOutput[element]) curOutput[element] = {
                                _type: "group"
                            };
                            curOutput = curOutput[element];
                        });

                        // If it doesn't exist yet, set instead of add (or else it says undefined at the start)
                        if (curOutput.hasOwnProperty(name)) {
                            curOutput[name].value += value;
                        } else {
                            curOutput[name] = {
                                _type: "function",
                                value: value
                            };
                        }
                    }
                    // No groups
                    else {
                        // If it doesn't exist yet, set instead of add (or else it says undefined at the start)
                        if (curOutput.hasOwnProperty(name)) {
                            curOutput[name] += value;
                        } else {
                            curOutput[name] = {
                                _type: "function",
                                value: value
                            };
                        }
                    }
                }

                // Whether or not a JSON object is empty
                function isJSONEmpty(obj) {
                    for (var prop in obj) {
                        if (obj.hasOwnProperty(prop))
                            return false;
                    }
                    return JSON.stringify(obj) === JSON.stringify({});
                }

                // Evaluates all the tokens and compiles commands
                function evaluate(exp, env) {
                    switch (exp.type) {
                        case "num":
                        case "bool":
                        case "selector":
                        case "kw":
                            return exp.value;
                        case "str":
                            return make_string(env, exp);
                        case "eval":
                            return evaluate(exp.value, env.extend());
                        case "colon":
                            return ":";
                        case "relative":
                            return exp.value;
                        case "comma":
                            return ",";
                        case "json":
                            return make_json(env, exp);
                        case "reg":
                            return reg_or_macro(env, exp);
                        case "comment":
                            return make_comment(env, exp);
                        case "command":
                            return make_command(env, exp);
                        case "array":
                            return make_array(env, exp);
                        case "ivar":
                            return get_ivar(env, exp);
                        case "assign":
                            return make_assign(env, exp);
                        case "binary":
                            return apply_op(exp.operator, evaluate(exp.left, env), evaluate(exp.right, env));
                        case "macro":
                            return make_macro(env, exp);
                        case "return":
                            return evaluate(exp.value, env);
                        case "if":
                            return make_if(env, exp);
                        case "for":
                            return make_for(env, exp);
                        case "foreach":
                            return make_foreach(env, exp);
                        case "execute":
                            return make_execute(env, exp);
                        case "function":
                            return make_func(env, exp);
                        case "group":
                            return make_group(env, exp);
                        case "setting":
                            return make_setting(env, exp);
                        case "prog":
                            return make_prog(env, exp);
                        case "call":
                            var macro = evaluate(exp.func, env);
                            return macro.apply(null, exp.args.map(function(arg) {
                                return evaluate(arg, env);
                            }));
                        default:
                            err("Unable to evaluate " + exp.type);
                    }
                }
            }

            /* Advanced Parser
            InputStream reads characters
            TokenStream is the lexer (converts everything into tokens)
            Parser tries to create node structures (AST) out of the tokens

            Parser based on: http://lisperator.net/pltut/
            */

            // List of all commands that exist in mc
            var availableCommands = ["advancement", "ban", "blockdata", "clear", "clone", "debug", "defaultgamemode", "deop", "difficulty", "effect", "enchant", "entitydata", "execute", "fill", "function", "gamemode", "gamerule", "give", "help", "kick", "kill", "list", "locate", "me", "op", "pardon", "particle", "playsound", "publish", "recipe", "reload", "replaceitem", "save", "say", "scoreboard", "seed", "setblock", "setidletimeout", "setmaxplayers", "setworldspawn", "spawnpoint", "spreadplayers", "stats", "stop", "stopsound", "summon", "teleport", "tell", "tellraw", "testfor", "testforblock", "testforblocks", "time", "title", "toggledownfall", "tp", "transferserver", "trigger", "weather", "whitelist", "worldborder", "wsserver", "xp"];

            // InputStream (Read input character by character)
            function InputStream(input) {
                var pos = 0,
                    line = 1,
                    col = 0,
                    lastVal = null,
                    lastWasNewLineVal = true;
                return {
                    next: next,
                    peek: peek,
                    eof: eof,
                    croak: croak,
                    last: last,
                    lastWasNewLine: lastWasNewLine
                };

                function next() {
                    // Knows whether or not we switched to a new line
                    if (peek() == "\n") lastWasNewLineVal = true;
                    else if ("\r\t ".indexOf(peek()) == -1) lastWasNewLineVal = false;
                    // Get the last character
                    lastVal = peek();

                    var ch = input.charAt(pos++);
                    if (ch == "\n") line++, col = 0;
                    else col++;
                    return ch;
                }

                function last() {
                    return lastVal;
                }

                function lastWasNewLine() {
                    return lastWasNewLineVal;
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
                var keywords = " function macro group if elseif else return execute true false var for foreach in ";
                var lastVal = null;
                return {
                    next: next,
                    peek: peek,
                    eof: eof,
                    croak: input.croak,
                    last: last
                };

                function is_keyword(x) {
                    return keywords.indexOf(" " + x + " ") >= 0;
                }

                function is_digit(ch) {
                    return /[0-9]/i.test(ch);
                }

                function is_id_start(ch) {
                    return /[a-z0-9_\$]/i.test(ch);
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
                    return " \t\n\r".indexOf(ch) >= 0;
                }
                // Read until the given predicate returns false
                function read_while(predicate) {
                    var str = "";
                    while (!input.eof() && predicate(input.peek()))
                        str += input.next();
                    return str;
                }

                function try_number() {
                    input.next();
                    if (is_digit(input.peek())) {
                        var num = read_number();
                        num.value *= -1;
                        return num;
                    }
                    input.croak("Can't handle character: " + input.peek());
                }

                function read_number() {
                    var has_dot = false;
                    var number = read_while(function(ch) {
                        if (ch == ".") {
                            if (has_dot) return false;
                            has_dot = true;
                            return true;
                        }
                        return is_digit(ch);
                    });
                    return {
                        type: "num",
                        value: parseFloat(number)
                    };
                }
                // Read identifiers, can return a keyword, an ivar ($variable), or reg (anything else)
                function read_ident() {
                    var id = read_while(is_id);
                    var type;
                    if (is_keyword(id)) type = "kw";
                    else if (is_ivar(id)) type = "ivar"
                    else type = "reg";

                    return {
                        type: type,
                        value: id
                    };
                }

                function read_escaped(end) {
                    var escaped = false,
                        str = "";
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
                    if (val.indexOf("`") >= 0) {

                        var evalBlock = false,
                            final = [],
                            str = "";
                        var arr = val.split('');

                        for (var i = 0; i < arr.length; i++) {
                            var ch = arr[i];

                            // Currently in an eval block
                            if (evalBlock) {
                                if (ch == '`') {
                                    evalBlock = false;
                                    // Parse the whole thing as if it was a full code block
                                    var parsedEval = Parser(TokenStream(InputStream(str)));
                                    if (parsedEval.prog.length != 0) {
                                        for (var x = 0; x < parsedEval.prog.length; x++) {
                                            if (parsedEval.prog[x].type == "comment") {
                                                input.croak("Comments are not allowed in evaluation blocks");
                                            } else if (parsedEval.prog[x].type == "function") {
                                                input.croak("Functions are not allowed in evaluation blocks");
                                            } else if (parsedEval.prog[x].type == "macro") {
                                                input.croak("Creating macros is not allowed in evaluation blocks");
                                            }
                                        }
                                        final.push(parsedEval);
                                    }
                                    str = "";
                                } else {
                                    str += ch;

                                    if (i == arr.length - 1) {
                                        if (str) final.push({
                                            type: "str",
                                            value: str
                                        });
                                    }
                                }
                            }
                            // Don't evalBlock
                            else {
                                if (ch == '`') {
                                    evalBlock = true;
                                    if (str) final.push({
                                        type: "str",
                                        value: str
                                    });
                                    str = "";
                                } else {
                                    str += ch;
                                    if (i == arr.length - 1) {
                                        if (str) final.push({
                                            type: "str",
                                            value: str
                                        });
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
                    return {
                        type: "str",
                        value: read_evaled(read_escaped('"'))
                    };
                }

                function selector_or_setting() {
                    var lastNewLine = input.lastWasNewLine();
                    input.next();
                    if (input.peek() == '!') {
                        if (!lastNewLine) input.croak('Settings with "@!" need to start at the begining of a line');
                        return read_settings();
                    } else {
                        return read_selector();
                    }
                }

                function read_selector() {
                    var output = read_while(function(ch) {
                        return (!is_whitespace(ch) && ch != ';')
                    });

                    return {
                        type: 'selector',
                        value: '@' + output
                    };
                }

                function read_settings() {
                    var output = read_while(function(ch) {
                        return ch != "\n"
                    });
                    return {
                        type: "setting",
                        value: output.replace('\r', '')
                    };
                }

                function read_relative() {
                    var val = read_while(function(ch) {
                        return (!is_whitespace(ch) && ch != ";");
                    });
                    return {
                        type: 'relative',
                        value: val
                    };
                }

                function read_colon() {
                    input.next();
                    return {
                        type: 'colon'
                    };
                }
                // Read comments that need to be added (#)
                function read_comment() {
                    if (!input.lastWasNewLine()) input.croak('Comments with "#" need to start at the begining of a line');
                    var output = read_while(function(ch) {
                        return ch != "\n"
                    });
                    return {
                        type: "comment",
                        value: output.replace('\r', '')
                    };
                }

                function skip_comment() {
                    read_while(function(ch) {
                        return ch != "\n"
                    });
                    input.next();
                }
                // Check whether or not the line is a // comment, skip it if so
                function check_comment() {
                    var output = read_while(function(ch) {
                        return ch == "/"
                    });
                    if (output == '//') {
                        skip_comment();
                    } else {
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
                    if (ch == "@") return selector_or_setting();
                    if (ch == '"') return read_string();
                    if (ch == "~") return read_relative();
                    if (ch == ":") return read_colon();
                    if (is_digit(ch)) return read_number();
                    if (is_id_start(ch)) return read_ident();
                    if (is_punc(ch)) return {
                        type: "punc",
                        value: input.next()
                    };
                    if (is_op_char(ch)) return {
                        type: "op",
                        value: read_while(is_op_char)
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
            var FALSE = {
                type: "bool",
                value: false
            };

            function Parser(input) {
                // Order of math operations, greater means included first
                var PRECEDENCE = {
                    "=": 1,
                    "||": 2,
                    "&&": 3,
                    "<": 7,
                    ">": 7,
                    "<=": 7,
                    ">=": 7,
                    "==": 7,
                    "!=": 7,
                    "+": 10,
                    "-": 10,
                    "*": 20,
                    "/": 20,
                    "%": 20,
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

                function skip_comma() {
                    if (is_punc(",")) {
                        input.next();
                        return {
                            type: "comma"
                        };
                    } else input.croak("Expecting comma: \"" + JSON.stringify(input.peek()) + "\"")
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
                                type: tok.value == "=" ? "assign" : "binary",
                                operator: tok.value,
                                left: left,
                                right: maybe_binary(parse_atom(), his_prec)
                            }, my_prec);
                        }
                    }
                    return left;
                }
                // Parses through anything between start and stop, with separator, using the given parser
                function delimited(start, stop, separator, parser) {
                    var a = [],
                        first = true;
                    skip_punc(start);
                    while (!input.eof()) {
                        if (is_punc(stop)) break;
                        if (first) first = false;
                        else if (check_last()) skip_punc(separator);
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
                    var cond = parse_expression();
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
                    return {
                        type: 'var',
                        value: parse_varname()
                    };
                }
                // Parse a for loop
                function parse_for() {
                    //input.croak("For loops are currently not supported");
                    skip_kw("for");
                    var params = delimited("(", ")", ";", parse_expression);
                    var then = parse_expression();
                    return {
                        type: "for",
                        params: params,
                        then: then,
                    };
                }
                // Parse a foreach loop
                function parse_foreach() {
                    skip_kw("foreach");
                    skip_punc("(");
                    skip_kw("var");
                    var varName = parse_ivar();
                    skip_kw("in");
                    var param = parse_expression();
                    skip_punc(")");
                    var then = parse_expression();
                    return {
                        type: "foreach",
                        variable: varName,
                        param: param,
                        then: then
                    };

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
                    var name = input.next();
                    // Check if what's afterwards is a call
                    if (input.peek().type == 'colon') {
                        var obj = {
                            type: "command",
                            value: [{
                                    type: "reg",
                                    value: "function"
                                },
                                name
                            ]
                        };
                        // Loop through it to add all of the arguments
                        while (!input.eof()) {
                            obj.value.push(input.next());

                            if (is_punc(';')) break;
                            else if (input.eof()) skip_punc(';');
                        }
                        return obj;
                    } else {
                        // It's not a call to a function, parse it as a normal function
                        return {
                            type: "function",
                            name: name.value,
                            body: parse_expression()
                        };
                    }
                }
                // Parsing a group (sub namespaces/folders)
                function parse_group() {
                    input.next();
                    return {
                        type: "group",
                        name: input.next().value,
                        body: parse_expression()
                    };
                }
                // Parse a macro, basically a function with parameters
                function parse_macro() {
                    input.next();
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

                function parse_execute() {
                    input.next();
                    var final = {
                        type: 'execute',
                        selector: '',
                        pos: []
                    };
                    var tokenCount = 0;
                    while (!input.eof()) {
                        if (tokenCount == 5) {
                            break;
                        } else {
                            var expr = parse_expression();
                            if (tokenCount == 0) final.selector = expr;
                            else if (tokenCount > 0 && tokenCount < 4) final.pos.push(expr);
                            else if (tokenCount == 4) final.prog = expr;
                            tokenCount++;
                            if (tokenCount == 4 && !is_punc('{')) unexpected();
                        }
                    }
                    return final;
                }
                // Bool just checks if the value is "true"
                function parse_bool() {
                    return {
                        type: "bool",
                        value: input.next().value == "true"
                    };
                }
                // Parse an ivar and detect whether or not it's asking for an index of an array
                function parse_ivar() {
                    var ivar = input.next();
                    if (is_punc("[")) {
                        skip_punc("[");
                        while (!input.eof()) {
                            if (is_punc("]")) break;
                            if (input.peek().type == "kw") unexpected();
                            ivar.index = parse_expression();
                            if (is_punc("]")) break;
                            else input.croak('Expecting punctuation: "]"');
                        }
                        skip_punc("]");
                    }
                    return ivar;
                }
                // Parsing an array declaration [5, "string", false]
                function parse_array() {
                    return {
                        type: "array",
                        value: delimited("[", "]", ",", function custom_parser() {
                            var i = input.peek();
                            // Don't allow keywords such as function, var... inside an array declaration
                            // Macro is allowed to allow for variable functions (lambdas) ($fn = macro call () { something; })
                            if (i.type == "kw" && i.value != "false" && i.value != "true" && i.value != "macro") unexpected();
                            else return parse_expression();
                        })
                    };
                }
                // Parsing a comment as an actual comment
                function parse_comment() {
                    return {
                        type: "comment",
                        value: input.next().value
                    };
                }

                function parse_setting() {
                    var setting = input.next().value.trim();
                    var indexSeparator = setting.indexOf(':');
                    if (indexSeparator == -1) input.croak('Expecting separator: ":"');
                    return {
                        type: 'setting',
                        name: setting.substring(setting.indexOf('!') + 1, indexSeparator).trim(),
                        value: setting.substring(indexSeparator + 1).trim()
                    };
                }
                // Relatives are already parsed
                function parse_relative() {
                    return input.next();
                }
                /* Parsing reg is complicated

                Most of the time, a reg is simply a minecraft command and its arguments, it checks if it's an actual command, and if so, it returns the full command
                Sometimes, it's the name of a macro or other function calling, if so return the exact token
                If it's neither of those, then it's unexpected
                */
                var lala;

                function parse_reg() {
                    // Regs are commands and command arguments
                    var final = {
                        type: "command",
                        value: []
                    };
                    if (availableCommands.includes(input.peek().value)) {
                        final.value.push(input.next());
                        while (!input.eof()) {
                            var next = parse_expression();
                            final.value.push(next);

                            if (is_punc(';')) break;
                            else if (input.eof()) skip_punc(';');
                        }
                        return final;
                    } else {
                        return input.next();
                        //unexpected();
                    }
                }
                // Check whether or not the given token is a JSON or a program
                function json_or_prog() {
                    skip_punc("{");
                    var a = {},
                        first = true;
                    // Check if the next item is a string
                    if (input.peek().type == "str") {
                        a = {
                            type: "json",
                            value: []
                        };
                        while (!input.eof()) {
                            if (is_punc("}")) break;
                            if (first) first = false;
                            else if (input.peek().type == "colon") first = true;
                            else a.value.push(skip_comma());;
                            if (is_punc("}")) break;
                            a.value.push(parse_expression());
                        }
                        skip_punc("}");
                        return a;
                    }
                    // Regular program
                    else {
                        a = {
                            type: "prog",
                            prog: []
                        };
                        while (!input.eof()) {
                            if (is_punc("}")) break;
                            if (first) first = false;
                            else if (check_last()) skip_punc(";");
                            if (is_punc("}")) break;
                            a.prog.push(parse_expression());
                        }
                        skip_punc("}");
                        if (a.prog.length == 0) return FALSE;
                        if (a.prog.length == 1) return a.prog[0];
                        return a;
                    }
                }

                function maybe_call(expr) {
                    expr = expr();
                    return is_punc("(") ? parse_call(expr) : expr;
                }
                // Major parser, checks what the token is an tells it to how to parse it
                function parse_atom() {
                    return maybe_call(function() {
                        if (is_punc("(")) {
                            input.next();
                            var exp = parse_expression();
                            skip_punc(")");
                            return exp;
                        }
                        if (is_punc("{")) return json_or_prog();
                        if (is_punc("[")) return parse_array();
                        if (is_kw("if")) return parse_if();
                        if (is_kw("var")) return parse_var();
                        if (is_kw("true") || is_kw("false")) return parse_bool();
                        if (is_kw("for")) return parse_for();
                        if (is_kw("foreach")) return parse_foreach();
                        if (is_kw("function")) return parse_function();
                        if (is_kw("group")) return parse_group();
                        if (is_kw("execute")) return parse_execute();
                        if (is_kw("macro")) return parse_macro();

                        if (is_kw("return")) return parse_return();
                        if (is_comment()) return parse_comment();
                        if (input.peek().type == 'reg') return parse_reg();
                        if (input.peek().type == 'setting') return parse_setting();
                        if (input.peek().type == "ivar") return parse_ivar();
                        if (input.peek().type == 'relative') return parse_relative();

                        var tok = input.next();
                        if (tok.type == 'colon' || tok.type == "selector" || tok.type == "num" || tok.type == "str")
                            return tok;
                        unexpected();
                    });
                }
                // Utility to check whether or not the last one was a comment or a setting (use it to prevent requirement of semicolon)
                function check_last() {
                    return (!input.last() || (input.last() && input.last().type != "comment" && input.last().type != "setting"));
                }
                // Parsing a program/top level
                function parse_toplevel() {
                    var prog = [];
                    while (!input.eof()) {
                        prog.push(parse_expression());
                        // Comments are special because they don't require a ; at the end, so we need to check that it's not a comment
                        if (is_comment()) {
                            prog.push(parse_comment());
                        } else if (!input.eof() && check_last()) skip_punc(";");
                    }
                    return {
                        type: "prog",
                        prog: prog
                    };
                }
                /* UNUSED but keep for clarity
                // Parse through a full program
                function parse_prog() {
                var prog = delimited("{", "}", ";", parse_expression);
                if (prog.length == 0) return FALSE;
                if (prog.length == 1) return prog[0];
                return { type: "prog", prog: prog };}*/
                // Parse through everything, parse binary and calls just in case
                function parse_expression() {
                    return maybe_call(function() {
                        return maybe_binary(parse_atom(), 0);
                    });
                }
            }

            function range_macro(min, max, delta) {
                // range(n) creates a array from 1 to n, including n.
                // range(m,n) creates a array from m to n, including n.
                // range(n,m,delta) creates a array from n to m, by step of delta. May not include max

                var arr = [];
                var myStepCount;

                if (arguments.length === 1) {
                    for (var ii = 0; ii < min; ii++) {
                        arr[ii] = ii + 1;
                    };
                } else {
                    if (arguments.length === 2) {
                        myStepCount = (max - min);
                        for (var ii = 0; ii <= myStepCount; ii++) {
                            arr.push(ii + min);
                        };
                    } else {
                        myStepCount = Math.floor((max - min) / delta);
                        for (var ii = 0; ii <= myStepCount; ii++) {
                            arr.push(ii * delta + min);
                        };
                    }
                }

                return arr;

            }

            /* This will appear at the bottom/end of the final dist file */

            // Get the abstract syntax tree from the input
            var ast = Parser(TokenStream(InputStream(input)));


            // Evaluate and Compile
            var output = Compiler(ast);

            return output;
        };

        mcs.help = function help() {
            console.log([
                '    mcs',
                '    A simple and easy to use scripting language which compiles into Minecraft functions.',
                '',
                '    Usage:',
                '    var output = mcs(input) - Converts MCS language into an object of function files',
                '',
                '    Check the GitHub repository for more info: https://github.com/PandawanFr/mcs'
            ]);

        }

        return mcs;
    })();

    /* Browser/AMD/NodeJS handling */
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = mcs;
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