const { src, dest, series, parallel, watch } = require('gulp');
const cleanCSS = require('gulp-clean-css');
const terser = require('gulp-terser');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const browserSync = require('browser-sync').create();

const MODULES = [
  // если появятся отдельные модули, добавим пути сюда (будут копироваться как есть)
];

// HTML
function copyHTML() {
  return src('src/*.html')
    .pipe(dest('dist'));
}

// Шрифты
function copyFonts() {
  return src('src/assets/fonts/**/*')
    .pipe(dest('dist/assets/fonts'));
}

// Изображения (без сжатия, с бинарной копией)
function copyImages() {
  return src('src/assets/img/**/*.*', { encoding: false })
    .pipe(dest('dist/assets/img'));
}

// Звуки
function copySounds() {
  return src('src/assets/sounds/**/*.*', { encoding: false })
    .pipe(dest('dist/assets/sounds'));
}

// CSS (готовые .css из src/css)
function minifyCSS() {
  return src('src/css/*.css')
    .pipe(postcss([autoprefixer()]))
    .pipe(cleanCSS())
    .pipe(dest('dist/css'));
}

// JS (минифицируем всё, кроме перечисленных в MODULES)
function minifyJS() {
  return src(['src/js/*.js', ...MODULES.map(m => '!' + m)])
    .pipe(terser())
    .pipe(dest('dist/js'));
}

// Копия модулей как есть (если нужны необфусцированные файлы)
function copyModules() {
  if (MODULES.length === 0) return Promise.resolve();
  return src(MODULES, { base: 'src/js' })
    .pipe(dest('dist/js'));
}

// Dev-сервер
function serve(done) {
  browserSync.init({ server: { baseDir: 'dist' }, notify: false, open: true });
  done();
}

// Релоад
function reload(done) {
  browserSync.reload();
  done();
}

// Вотчеры
function watchFiles() {
  watch('src/*.html', series(copyHTML, reload));
  watch('src/css/*.css', series(minifyCSS, reload));
  watch('src/js/*.js', series(parallel(minifyJS, copyModules), reload));
  watch('src/assets/fonts/**/*.{woff,woff2,ttf,otf}', series(copyFonts, reload));
  watch('src/assets/img/**/*.{png,jpg,jpeg,gif,svg,webp,avif}', series(copyImages, reload));
  watch('src/assets/sounds/**/*.{mp3,wav,ogg,m4a}', series(copySounds, reload));
}

exports.default = series(
  parallel(copyHTML, minifyCSS, minifyJS, copyModules, copyFonts, copyImages, copySounds),
  serve,
  watchFiles
);
