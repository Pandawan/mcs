# mcs: Minecraft Script

[![npm](https://img.shields.io/npm/v/mcs.svg?style=flat-square)](https://www.npmjs.com/package/mcs)
[![license](https://img.shields.io/github/license/pandawanfr/mcs.svg?style=flat-square)](https://github.com/pandawanfr/mcs)

#### A pre-processor to write Minecraft Functions more efficiently.

Try it with the [Online Editor](https://pandawanfr.github.io/MCSEditor/)!

Check out the [changelog](https://github.com/PandawanFr/mcs/blob/master/Changelog.md) for a list of new features!

*Latest Compatible Minecraft Version: 1.12*

Note: I called it Script because it has a syntax similar to JavaScript.

# Documentation
Learn how to write in Minecraft Script in the [Wiki](https://github.com/PandawanFr/mcs/wiki).

# Installation
`mcs` has been tested with node and as a standalone (web) script. Though it should also support CommonJS (node, browserify) and AMD (RequireJS).

## Node
Installation via `npm`:

```shell
$ npm install mcs

> var mcs = require('mcs');
> mcs('function hello { say hello world; }');
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

Download [mcs.min.js](https://github.com/PandawanFr/mcs/blob/master/mcs.min.js)

Add to your html

```html
<script src="path/to/mcs.min.js"></script>
```

# Usage

## JS
```javascript
var input = 'function hello { say hello world; }'
var result = mcs(input)
// result = { "_namespace": { "_type": "namespace", "hello": { "_type": "function", "value": "say hello world\n" } } }
```
`mcs()` takes one required argument, the input (string to convert), and returns a JSON object, with the file name as key and its file content as value.

## CLI
```shell
$ mcs [input] [output (optional)]
```
Using `mcs` in the CLI takes one require argument, the `input` file (.mcs file), and outputs to the (optional) `output` directory. If no output directory is given, `./` is used.

# TODO
Check out the current todo list [here](https://github.com/PandawanFr/mcs/blob/master/Todo.md).

# Contributing
1. Create an issue and describe your idea
2. [Fork it](https://github.com/PandawanFr/mcs/fork)
3. Checkout this repository
4. Install the dependencies `npm install` or `yarn`
5. Edit the files in `/src`
6. Test your changes with
```shell
$ npm run build
$ node index.js [input] [output]
or
$ npm run bnt

edit /test/input.mcs and check output at /test/output/
```
7. You can also test your changes on the web by copying the `dist/mcs.min.js` file
8. Once done, create a pull request

# Authors
Made by [Pandawan](http://twitter.com/PandawanYT).
Thanks to [Andrew Mast](https://github.com/AndrewMast) and [Chris Smith](https://github.com/chris13524) for helping out and providing feedback!

# License
Please see the [LICENSE](https://github.com/PandawanFr/mcs/blob/master/LICENSE) file

`mcs` is not affiliated with Minecraft or Mojang AB.
