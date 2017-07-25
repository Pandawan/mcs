#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const mcs = require("./mcs");
const chalk = require('chalk');
const pkginfo = require('pkginfo')(module);


let input = '';
let outputDir = './';
let curDir = path.normalize(process.cwd());

if (process.argv[2] == '--help' || process.argv[2] == '-h') {
	console.log([
		'    mcs',
		'    A Minecraft Scripting language which converts to functions',
		'    ',
		'    Commands:',
		'        mcs <input> [output (optional)] - Convert input file to output directory',
		'        mcs --help                      - Display this help menu',
		'    Examples:',
		'        Convert file.mcs in the current directory',
		'        mcs ./file.mcs'
		'        Convert file.mcs in the ./output directory',
		'        mcs ./file.mcs ./output'
	].join('\n'));
}
else if (process.argv[2] == '--version' || process.argv[2] == '-v') {
	console.log([
		'mcs v' + module.exports.version
	].join('\n'));
}
else {
	run();
}

function run() {

	if (process.argv[2]  && /.*(.mcs)$/.test(process.argv[2])) {
		input = path.normalize(process.argv[2]);
	}
	else {
		console.log(chalk.red('Error: ') + 'No valid input file (.mcs) given!');
		return;
	}

	if (process.argv[3]) {
		outputDir = path.normalize(process.argv[3]);
	}

	fs.readFile(input, 'utf8', function (err, data) {
		if (err) {
			console.log(err);
			return;
		}
		var output = mcs(data, { debug: false});
		if (output) {
			for (var file in output) {
				var fileData = output[file];
				writeFile(path.join(outputDir, file), fileData);
			}
		}
	});
}

function writeFile (file, data) {
	fs.writeFile(file, data, 'utf8', function (err) {
		if (err) {
			console.log(err);
			return;
		}

		console.log(chalk.green('Success: ') + 'Created file ' + file);
	});
}
