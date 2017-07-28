

# mcs: Minecraft Script

[![npm](https://img.shields.io/npm/v/mcs.svg?style=flat-square)](https://www.npmjs.com/package/mcs)
[![license](https://img.shields.io/github/license/pandawanfr/mcs.svg?style=flat-square)](https://github.com/pandawanfr/mcs)

`mcs` is a simple and easy to use scripting language which compiles into Minecraft functions.

Try it with the [Online Editor](https://pandawanfr.github.io/MCSEditor/)!

Latest Compatible Minecraft Version: 1.12

Note: It works more similarly to a pre-processor, but has a syntax similar to JavaScript, which is why I called it a Script.

# Documentation
Learn how to write in Minecraft Script in the [Wiki](https://github.com/PandawanFr/mcs/wiki)

# Installation
mcs has been tested with node and as a standalone script. Though it should also support CommonJS (node, browserify) and AMD (RequireJS).

## Node
Installation via `npm`:

```shell
$ npm install mcs

> var mcs = require('mcs');
> mcs('function hello {\n say hello world \n}');
```
Alternatively you can install mcs globally so that it may be run from the command line.

```shell
$ npm install mcs -g
$ mcs ./input.mcs ./output/
```

## Standalone/Script

Add to your html

```html
<script src="https://unpkg.com/mcs"></script>
```

### Or include it manually

Download [mcs.js](https://github.com/PandawanFr/mcs/blob/master/mcs.js)

Add to your html

```html
<script src="path/to/mcs.js"></script>
```

# Usage

## JS
```javascript
var input = 'function hello {\n say hello world \n}'
var result = mcs(input)
// result = { "hello.mcfunction": "say hello world" }
```

`mcs()` takes one required argument, the input (string to convert), and returns a JSON object, with the file name as key and its file content as value.

## CLI
```shell
$ mcs [input] [output (optional)]
```
Using `mcs` in the CLI takes one require argument, the `input` file (.mcs file), and outputs to the (optional) `output` directory. If no output directory is given, `./` is used.


## TODO
For 2.0.0
- [ ] Add If/Unless code blocks
- [ ] Separate statements with `{ } ;` (punctuation) rather than newlines
- [ ] Add For loops (If possible)
- [ ] Add function parameters (scoreboards)
- [ ] Add data pack and namespace support
- [ ] Use Regexp to parse data
- [ ] Allow different coding styles (no space before {}...)
- [ ] Clean up Code (refractor and separate lexer, parser and mcs)
- [ ] Rewrite mcs.js with more optimization and better style


# Contributing
1. Create an issue and describe your idea
2. [Fork it](https://github.com/PandawanFr/mcs/fork)
3. Checkout this repository
4. Install the dependencies `npm install` or `yarn`
5. Test your changes with
```shell
$ node index.js [input] [output]
or
$ npm test
edit /test/input/file.mcs and check output at /test/output/
```
6. You can also test your changes on the web with
- Copy the `mcs.js` file to `./test/web`
- Open the `index.html` file
7. Once done, create a pull request

# Authors
Made by [Pandawan](http://twitter.com/PandawanYT)

# License
Please see the [LICENSE](https://github.com/PandawanFr/mcs/blob/master/LICENSE) file

Minecraft Script is not affiliated with Minecraft or Mojang AB.