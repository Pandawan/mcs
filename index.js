#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const mcs = require("./mcs");
const chalk = require('chalk');
const yargs = require('yargs');

let input = '';
let outputDir = './';
let curDir = path.normalize(process.cwd());

if (yargs.argv.help) {
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
	].join('\n'));
} else {
	run();
}

function run() {

	if (yargs.argv._[0]  && /.*(.mcs)$/.test(yargs.argv._[0])) {
		input = path.join(curDir, yargs.argv._[0]);
	}
	else {
		console.log(chalk.red('Error: ') + 'No valid input file (.mcs) given!');
		return;
	}

	if (yargs.argv._[1]) {
		outputDir = path.normalize(yargs.argv._[1]);
	}

	fs.readFile(input, 'utf8', function (err, data) {
		if (err) {
			console.log(err);
			return;
		}
		var output = mcs(data, { debug: false});
		for (var file in output) {
			var fileData = output[file];
			writeFile(path.join(outputDir, file), fileData);
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
