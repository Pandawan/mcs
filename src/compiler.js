/* Compile the AST into a final JSON object */

function Compiler(exp) {

    var debug = true,
        oldDebug = true,
        addTop = "";

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

    function quickEvaler(exp, env) {
        function quickEval(element) {
            if (element.type == "command") addTop += make_command(env, element) + "\n";
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
        function macro() {
            var names = exp.vars;
            var scope = env.extend();
            for (var i = 0; i < names.length; ++i)
                scope.def(names[i], i < arguments.length ? arguments[i] : false);

            return quickEvaler(exp.body, scope);

        }
        return env.set(exp.name, macro);
    }

    // Macros have their name as a reg, so need to separate macros from actual regs
    function reg_or_macro(env, exp) {
        oldDebug = debug;
        try {
            debug = false;
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
        }
        return exp.else ? evaluate(exp.else, env.extend()) : false;
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

    function get_ivar(env, exp) {
        var ivar = env.get(exp.value);
        if (exp.index) {
            var index = evaluate(exp.index, env);
            if (typeof(index) != "number") err("Array index must be a number");
            return ivar[index];
        } else return ivar;
    }

    function make_assign(env, exp) {
        if (exp.left.type == "ivar") return env.set(exp.left.value, evaluate(exp.right, env));
        else if (exp.left.type == "var") {
            return env.def(exp.left.value, evaluate(exp.right, env));
        }
    }

    function make_json(env, exp) {
        var json = "{";
        for (var i = 0; i < exp.value.length; i++) {
            var toAdd = "";
            if (exp.value[i].type == "str") {
                toAdd = "\"" + evaluate(exp.value[i], env) + "\"";
            } else if (exp.value[i].type == "array") {
                var temp = evaluate(exp.value[i], env);
                toAdd = JSON.stringify(Object.keys(temp).map(function(k) {
                    return temp[k];
                }));
            } else {
                toAdd = evaluate(exp.value[i], env);
            }
            json += toAdd;
        }
        json += "}";
        return json;
    }
    // Create a command
    function make_command(env, exp) {
        var cmd = "";
        if (env.parent == null) err("Commands cannot be used in root");
        for (var i = 0; i < exp.value.length; i++) {
            if (i != 0) cmd += " ";
            cmd += evaluate(exp.value[i], env);
        }
        return cmd;
    }

    function make_prog(env, exp) {
        var final = "";
        exp.prog.forEach(function(exp) {
            if (exp.type == "command") {
                var cmd = evaluate(exp, env);
                final += addTop + cmd + "\n";
                addTop = "";
            } else evaluate(exp, env);
        });
        return final;
    }

    function make_func(env, exp) {
        var x = evaluate(exp.body, env.extend());
        output[exp.name] = x;
    }

    // Evaluates all the tokens and compiles commands
    function evaluate(exp, env) {
        switch (exp.type) {
            case "num":
            case "str":
            case "bool":
                return exp.value;
            case "colon":
                return ":";
			case "relative":
				return exp.offset ? ("~" + exp.offset) : "~";
            case "comma":
                return ",";
            case "json":
                return make_json(env, exp);
            case "reg":
                return reg_or_macro(env, exp);
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
            case "function":
                return make_func(env, exp);
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
