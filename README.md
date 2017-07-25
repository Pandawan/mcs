# mcs: Minecraft Script

`mcs` is a simple and easy to use scripting language which compiles into Minecraft functions.

Latest Compatible Minecraft Version: 1.12

# Documentation
Learn how to write in Minecraft Script in the [Wiki](https://github.com/PandawanFr/mcs/wiki)

# Installation
mcs has been tested with node and as a standalone script. Though it should also support CommonJS (node, browserify) and AMD (RequireJS).

## Node
Installation via `npm`:

```shell
$ npm install mcs

> var mcs = require('mcs');
> mcs('function hello {\n say("world") \n}');
```
Alternatively you can install mcs globally so that it may be run from the command line.

```shell
$ npm install mcs -g
$ mcs ./input.mcs ./output/
```

## Standalone/Script

Download [msc.js](https://github.com/PandawanFr/mcs/blob/master/mcs.js)

Add to your html

```html
<script type="text/javascript" src="path/to/mcs.js"></script>
```

# Usage

## JS
```javascript
var input = 'function hello {\n say("world") \n}'
var result = mcs(input)
// result = { "hello.mcfunction": "say world" }
```

`mcs()` takes one required argument, the input (string to convert), and returns a JSON object, with the file name as key and its file content as value.

## CLI
```shell
$ mcs [input] [output (optional)]
```
Using `mcs` in the CLI takes one require argument, the `input` file (.mcs file), and outputs to the (optional) `output` directory. If no output directory is given, `./` is used.

# Development

Checkout this repository locally, then:

```sh
$ npm i
$ node index.js [input] [output (optional)]
```

To test on the web:
- Copy the `mcs.js` file to `./test/web`
- Open the `index.html` file
