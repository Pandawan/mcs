const gulp = require('gulp');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const uglify = require("gulp-uglify");
const babel  = require('gulp-babel');
const prettify = require('gulp-jsbeautifier');
const pump = require('pump');

const src = 'src/*.js';
const orderedSrc = ['src/front.js', 'src/!(front|back)*.js', 'src/back.js'];
const dist = 'dist';

gulp.task('build', function (cb) {
	pump([
		gulp.src(orderedSrc),
		concat('mcs.js'),
		prettify(),
		gulp.dest(dist)
	], cb);
});

gulp.task('build-min', function (cb) {
	pump([
		gulp.src(orderedSrc),
		concat('mcs.js'),
		prettify(),
		gulp.dest(dist),
		rename('mcs.min.js'),
		babel({presets: ['es2015']}),
		uglify({ compress: false }),
		gulp.dest(dist)
	], cb);
});

gulp.task('build-all', ['build-min']);

gulp.task('watch', function () {
	gulp.watch(src, ['build-all']);
});

gulp.task('default', ['build-all', 'watch']);
