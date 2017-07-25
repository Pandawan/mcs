#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const mcs = require("./mcs");

fs.readFile(path.join(__dirname, 'file.mcs'), 'utf8', function (err, data) {
	if (err) {
		console.log(err);
		return;
	}
	var output = mcs(data, { debug: false});
	for (var file in output) {
		var fileData = output[file];
		writeFile(file, fileData);
	}
});

function writeFile (file, data) {
	fs.writeFile(path.join(__dirname, file), data, 'utf8', function (err) {
		if (err) {
			console.log(err);
			return;
		}

		console.log('Created file ' + file);
	});
}
