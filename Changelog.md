# Changelog
## Version 2.0.0
Revamped the entire system, with a new parser, a compiler and a lot of new features!
- No need for new lines! Use semicolons to end a statement;
- Better variables (use $ every time)
- Arrays
- Selectors (`@a[score_hello=5]`)
- Relative (`~`)
- Call functions just like you would in normal commands (`function <namespace>:[folder/]<name>`)
- Groups, create sub folders/groups of functions
- Macros, call "methods" to write more efficiently.
- If, Else if, Else
- For loops (`for(var $i = 0; $i < 5; $i = $i + 1)`)
- Foreach loops (`foreach(var $i in range(0,5))`)
- Evaluation Blocks, use mcs inside a string (```"this is an eval block -> `return 1+2;`  "```)
- Settings, set your own namespace (`@!namespace: myNamespace`)

You can check out the new syntax in use [here](https://github.com/PandawanFr/mcs/blob/master/test/new_syntax.mcs) and its [output](https://github.com/PandawanFr/mcs/tree/master/test/syntax_output).
