#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const mcs = require("./dist/mcs");
const chalk = require('chalk');
const pkginfo = require('pkginfo')(module);

let input = '';
let outputDir = './';
let curDir = path.normalize(process.cwd());

if (process.argv[2] == '--help' || process.argv[2] == '-h') {
    console.log([
        '    mcs',
        '    A simple and easy to use scripting language which compiles into Minecraft functions.',
        '    ',
        '    Commands:',
        '        mcs <input> [output (optional)]    - Convert input file to output directory',
        '        mcs --debug <input> [output (opt)] - Convert input file to output directory and an output.json',
        '        mcs --version                      - Displays the version number',
        '        mcs --help                         - Display this help menu',
        '    Examples:',
        '        Convert file.mcs in the current directory',
        '        mcs ./file.mcs',
        '        Convert file.mcs in the ./output directory',
        '        mcs ./file.mcs ./output',
        '    ',
        '    Check the GitHub repository for more info: https://github.com/PandawanFr/mcs'
    ].join('\n'));
} else if (process.argv[2] == '--version' || process.argv[2] == '-v') {
    console.log([
        'mcs v' + module.exports.version
    ].join('\n'));
} else if (process.argv[2] == '--debug' || process.argv[2] == '-d') {
    run(true);
} else {
    run(false);
}

function run(debug) {
    var extraArg = debug ? 1 : 0;

    if (process.argv[2 + extraArg] && /.*(.mcs)$/.test(process.argv[2 + extraArg])) {
        input = path.normalize(process.argv[2 + extraArg]);
    } else {
        console.log(chalk.red('Error: ') + 'No valid input file (.mcs) given!');
        return;
    }

    if (process.argv[3 + extraArg]) {
        outputDir = path.normalize(process.argv[3 + extraArg]);
    }

    fs.readFile(input, 'utf8', function(err, data) {
        if (err) {
            console.log(err);
            return;
        }
        var output = mcs(data);
        if (output) {
            // Debug also adds the output.json for what would be a call to mcs directly (rather than using CLI/wrapper)
            if (debug) {
                writeFile(path.join(outputDir, 'output.json'), JSON.stringify(output, null, '\t'));
            }

            var namespace = Object.keys(output)[0];
            recursiveOutput(output[namespace], namespace);
        }
    });
}
var currentFinalDir = [];

function recursiveOutput(data, name) {
    // If it's a namespace or a group, add it
    if (data._type == "namespace" || data._type == "group") {
        // Add name to subdir list
        currentFinalDir.push(name);
        // Check that it exists, create dir if not
        if (!fs.existsSync(path.join(outputDir, currentFinalDir.join('/')))) {
            fs.mkdirSync(path.join(outputDir, currentFinalDir.join('/')));
        }
        // Recursive for each value
        Object.keys(data).forEach(function(element) {
            if (element != "_type") recursiveOutput(data[element], element);
        });
        // Pop the dir
        currentFinalDir.pop();
    } else if (data._type == "function") {
        // Write file
        writeFile(path.join(outputDir, currentFinalDir.join('/'), name + '.mcfunction'), data.value);
    }
}

function writeFile(file, data) {
    fs.writeFile(file, data, 'utf8', function(err) {
        if (err) {
            console.log(err);
            return;
        }

        console.log(chalk.green('Success: ') + 'Created file ' + file);
    });
}
