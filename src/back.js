/* This will appear at the bottom/end of the final dist file */

// Get the abstract syntax tree from the input
var ast = Parser(TokenStream(InputStream(input)));


// Evaluate and Compile
var output = Compiler(ast);

return output;
};

mcs.help = function help() {
    console.log([
        '    mcs',
        '    A pre-processor to write Minecraft Functions more efficiently',
        '',
        '    Usage:',
        '    var output = mcs(input) - Converts MCS language into an object of function files',
        '',
        '    Check the GitHub repository for more info: https://github.com/PandawanFr/mcs'
    ]);

}

return mcs;
})();

/* Browser/AMD/NodeJS handling */
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = mcs;
} else {
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return mcs;
        });
    } else {
        window.mcs = mcs;
    }
}

})();
