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
        if (op == "+" && (typeof a == "string" || typeof b == "string")) {
            return a + b;
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
            case "^":
                return Math.pow(num(a),num(b));
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
        // Evaluate all the values
        var selector = evaluate(exp.selector, env);
        var pos1 = evaluate(exp.pos[0], env);
        var pos2 = evaluate(exp.pos[1], env);
        var pos3 = evaluate(exp.pos[2], env);
        // Add prefix
        prefix.push("execute " + selector + " " + pos1 + " " + pos2 + " " + pos3 + " ");
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

    // Relatives can be evaluated
    function make_relative(env, exp) {
        if (exp.value && exp.value.length > 0) {
            var final = "~";
            for (var i = 0; i < exp.value.length; i++) {
                final += evaluate(exp.value[i], env);
            }
            return final;
        } else {
            return "~";
        }
    }

    // Selectors can be evaluated
    function make_selector(env, exp) {
        // If the selector's value is an array
        if (Array.isArray(exp.value)) {
            if (exp.value && exp.value.length > 0) {
                var final = exp.prefix + "[";
                for (var i = 0; i < exp.value.length; i++) {
                    // Only compile ivars (already created variables/calls)
                    if (exp.value[i].type == "ivar") {
                        var x = evaluate(exp.value[i], env.extend());
                        final += x;
                    } else final += exp.value[i].value;
                }
                return final + "]";
            } else {
                return exp.prefix;
            }
        } else {
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
        var lastVal = "";
        if (env.parent == null) err("Commands cannot be used in root");
        for (var i = 0; i < exp.value.length; i++) {
            var valueToAdd = evaluate(exp.value[i], env);
            if (valueToAdd != ":" && lastVal != "" & lastVal != ":") cmd += " ";
            cmd += valueToAdd;

            lastVal = valueToAdd;
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
        if (inFunc) err("Cannot declare a function inside another");
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
            case "kw":
                return exp.value;
            case "str":
                return make_string(env, exp);
            case "eval":
                return evaluate(exp.value, env.extend());
            case "colon":
                return ":";
            case "relative":
                return make_relative(env, exp);
            case "selector":
                return make_selector(env, exp);
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
