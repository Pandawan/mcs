/* This will appear at the top/start of the final dist file */
(function () {

	var mcs = (function () {

		var mcs = function(input) {
			if (!input || typeof(input) !== 'string'){
				var err = 'Error: Object to parse is not a valid string or does not exist.';
				console.error(err);
				return err;
			}
