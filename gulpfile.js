const _ = require('lodash');
const del = require('del');
const gulp = require('gulp');
const gulpUtil = require('gulp-util');
const helpers = require('./config/helpers');
const isDocker = require('is-docker');
const tildeImporter = require('node-sass-tilde-importer');

/** TSLint checker */
const tslint = require('tslint');
const gulpTslint = require('gulp-tslint');

/** External command runner */
const process = require('process');
const execSync = require('child_process').execSync;

/** File Access */
const fs = require('fs');
const path = require('path');
const gulpFile = require('gulp-file');

/** To properly handle pipes on error */
const pump = require('pump');

/** Testing/Code Coverage */
const gulpCoveralls = require('gulp-coveralls');

/** To order tasks */
const runSequence = require('run-sequence');

/** To compile & bundle the library with Angular & Rollup */
const ngc = (args) => new Promise((resolve, reject) => { // Promisify version of the ngc compiler
    let exitCode = require('@angular/compiler-cli/src/main').main(args);
    resolve(exitCode);
});
const rollup = require('rollup');
const rollupUglify = require('rollup-plugin-uglify');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const rollupNodeResolve = require('rollup-plugin-node-resolve');
const rollupCommonjs = require('rollup-plugin-commonjs');

/** To load templates and styles in Angular components */
const gulpInlineNgTemplate = require('gulp-inline-ng2-template');

/** Sass style */
const sass = require('node-sass');
const cssnano = require('cssnano');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const stripInlineComments = require('postcss-strip-inline-comments');

//Bumping, Releasing tools
const gulpGit = require('gulp-git');
const gulpBump = require('gulp-bump');
const gulpConventionalChangelog = require('gulp-conventional-changelog');
const conventionalGithubReleaser = require('conventional-github-releaser');

/** To load gulp tasks from multiple files */
const gulpHub = require('gulp-hub');

/** Documentation generation tools **/
const gulpCompodoc = require('@compodoc/gulp-compodoc');

const yargs = require('yargs');
const argv = yargs
    .option('version', {
        alias: 'v',
        describe: 'Enter Version to bump to',
        choices: ['patch', 'minor', 'major'],
        type: "string"
    })
    .option('ghToken', {
        alias: 'gh',
        describe: 'Enter Github Token for releasing',
        type: "string"
    })
    .version(false) // disable default --version from yargs( since v9.0.0)
    .argv;

const license = require('gulp-license-check');

const config = {
    libraryName: '@deja-js/component',
    unscopedLibraryName: 'dejajs-component',
    allSrc: 'src/**/*',
    allTs: 'src/**/!(*.spec).ts',
    allSass: 'src/**/*.+(scss|sass)',
    allHtml: 'src/**/*.html',
    demoDir: 'demo/',
    buildDir: 'tmp/',
    outputDir: 'dist/',
    outputDemoDir: 'demo/dist/browser/',
    coverageDir: 'coverage/',
    docDir: 'doc/'
};

const rootFolder = path.join(__dirname);
const buildFolder = path.join(rootFolder, `${config.buildDir}`);
const distFolder = path.join(rootFolder, `${config.outputDir}`);
const outputFolder = path.join(buildFolder, 'lib');
// const docFolder = path.join(rootFolder, `${config.docDir}`);

const ignoredRollUpMessages = [
    'treating it as an external dependency',
    'No name was provided for external module'
];
const displayWarning = function(warn) {
    var isNotAnIgnoredMessage = ignoredRollUpMessages.every(function(mess) {
        return warn.message.indexOf(mess) != -1;
    });
    if (isNotAnIgnoredMessage) {
        console.log('WARNING : ', warn.message);
    }
}

//Helper functions
const startKarmaServer = (isTddMode, hasCoverage, cb) => {
    const karmaServer = require('karma').Server;
    const isCI = process.env.TRAVIS || isDocker();

    let config = {
        configFile: `${__dirname}/karma.conf.js`,
        singleRun: !isTddMode,
        autoWatch: isTddMode
    };

    if (isCI) {
        config['browsers'] = ['ChromeHeadlessCI'];
    }

    config['hasCoverage'] = hasCoverage;

    new karmaServer(config, cb).start();
};

const getPackageJsonVersion = () => {
    // We parse the json file instead of using require because require caches
    // multiple calls so the version number won't be updated
    return JSON.parse(fs.readFileSync('./package.json', 'utf8')).version;
};

const isOK = condition => {
    if (condition === undefined) {
        return gulpUtil.colors.yellow('[SKIPPED]');
    }
    return condition ? gulpUtil.colors.green('[OK]') : gulpUtil.colors.red('[KO]');
};

const readyToRelease = () => {
    let isTravisPassing = /build #\d+ passed/.test(execSync('npm run check-travis').toString().trim());
    let onMasterBranch = execSync('git symbolic-ref --short -q HEAD').toString().trim() === 'master';
    let canBump = !!argv.version;
    let canGhRelease = argv.ghToken || process.env.CONVENTIONAL_GITHUB_RELEASER_TOKEN;
    let canNpmPublish = !!execSync('npm whoami').toString().trim() && execSync('npm config get registry').toString().trim() === 'https://registry.npmjs.org/';

    gulpUtil.log(`[travis-ci]      Travis build on 'master' branch is passing............................................${isOK(isTravisPassing)}`);
    gulpUtil.log(`[git-branch]     User is currently on 'master' branch..................................................${isOK(onMasterBranch)}`);
    gulpUtil.log(`[npm-publish]    User is currently logged in to NPM Registry...........................................${isOK(canNpmPublish)}`);
    gulpUtil.log(`[bump-version]   Option '--version' provided, with value : 'major', 'minor' or 'patch'.................${isOK(canBump)}`);
    gulpUtil.log(`[github-release] Option '--ghToken' provided or 'CONVENTIONAL_GITHUB_RELEASER_TOKEN' variable set......${isOK(canGhRelease)}`);

    return isTravisPassing && onMasterBranch && canBump && canGhRelease && canNpmPublish;
};

const execCmd = (name, args, opts, ...subFolders) => {
    const cmd = helpers.root(subFolders, helpers.binPath(`${name}`));
    return helpers.execp(`${cmd} ${args}`, opts)
        .catch(e => {
            gulpUtil.log(gulpUtil.colors.red(`${name} command failed. See below for errors.\n`));
            gulpUtil.log(gulpUtil.colors.red(e));
            process.exit(1);
        });
};

const execExternalCmd = (name, args, opts) => {
    return helpers.execp(`${name} ${args}`, opts)
        .catch(e => {
            gulpUtil.log(gulpUtil.colors.red(`${name} command failed. See below for errors.\n`));
            gulpUtil.log(gulpUtil.colors.red(e));
            process.exit(1);
        });
};

// Compile Sass to css
const styleProcessor = (stylePath, ext, styleFile, callback) => {
    /**
     * Remove comments, autoprefixer, Minifier
     */
    const processors = [
        stripInlineComments,
        autoprefixer,
        cssnano
    ];

    const postProcessCss = css => {
        postcss(processors).process(css).then(result => {
            result.warnings().forEach(function(warn) {
                gutil.warn(warn.toString());
            });
            styleFile = result.css;
            callback(null, styleFile);
        });
    };

    if (/\.(scss|sass)$/.test(ext[0])) {
        let sassObj = sass.renderSync({
            file: stylePath,
            importer: tildeImporter
        });
        if (sassObj && sassObj['css']) {
            let css = sassObj.css.toString('utf8');
            postProcessCss(css);
        }
    } else if (/\.css$/.test(ext[0])) {
        postProcessCss(styleFile);
    }
};

/////////////////////////////////////////////////////////////////////////////
// Cleaning Tasks
/////////////////////////////////////////////////////////////////////////////
gulp.task('clean:dist', () => {
    return del(config.outputDir);
});

gulp.task('clean:build', () => {
    return del(config.buildDir);
});

gulp.task('clean:coverage', () => {
    return del(config.coverageDir);
});

gulp.task('clean:doc', () => {
    return del(`${config.docDir}`);
});

gulp.task('clean', ['clean:dist', 'clean:coverage', 'clean:build']);

/////////////////////////////////////////////////////////////////////////////
// Compilation Tasks
/////////////////////////////////////////////////////////////////////////////

gulp.task('lint', (cb) => {
    pump([
        gulp.src(config.allTs),
        gulpTslint({
            program: tslint.Linter.createProgram('./tsconfig.json'),
            formatter: 'verbose',
            configuration: 'tslint.json'
        }),
        gulpTslint.report()
    ], cb);
});

// Inline Styles and Templates into components
gulp.task('inline-templates', (cb) => {
    const options = {
        base: `${config.buildDir}`,
        styleProcessor: styleProcessor,
        useRelativePaths: true
    };
    pump(
        [
            gulp.src(config.allTs),
            gulpInlineNgTemplate(options),
            gulp.dest(`${config.buildDir}`)
        ],
        cb);
});

// Prepare files for compilation
gulp.task('pre-compile', (cb) => {
    pump([
        gulp.src([config.allSrc]),
        gulp.dest(config.buildDir)
    ], cb);
});

gulp.task('ng-compile', () => {
    return Promise.resolve()
        .then(() => ngc(['--project', `${buildFolder}/tsconfig.es5.json`])
            .then(exitCode => exitCode === 0 ? Promise.resolve() : Promise.reject())
            .then(() => gulpUtil.log('ES5 compilation succeeded.'))
        )
        .catch(e => {
            gulpUtil.log(gulpUtil.colors.red('ng-compilation failed. See below for errors.\n'));
            gulpUtil.log(gulpUtil.colors.red(e));
            process.exit(1);
        });
});

// Lint, Prepare Build, , Sass to css, Inline templates & Styles and Ng-Compile
gulp.task('compile', (cb) => {
    runSequence('lint', 'pre-compile', 'inline-templates', 'ng-compile', cb);
});

// Prepare Build, , Sass to css, Inline templates & Styles and Ng-Compile
gulp.task('compile-no-lint', (cb) => {
    runSequence('pre-compile', 'inline-templates', 'ng-compile', cb);
});

// Build the 'dist' folder (without publishing it to NPM)
gulp.task('build', ['clean'], (cb) => {
    runSequence('compile', 'test', 'npm-package', 'rollup-bundle', cb);
});

// Same as 'build' but without cleaning temp folders (to avoid breaking demo app, if currently being served)
gulp.task('build-watch', (cb) => {
    runSequence('compile', 'test', 'npm-package', 'rollup-bundle', cb);
});

// Same as 'build-watch' but without running tests
gulp.task('build-watch-no-tests', (cb) => {
    runSequence('compile-no-lint', 'npm-package', 'rollup-bundle', cb);
});

// Watch changes on (*.ts, *.html, *.sass) and Re-build library
gulp.task('build:watch', ['build-watch'], () => {
    gulp.watch([config.allTs, config.allHtml, config.allSass], ['build-watch']);
});

// Watch changes on (*.ts, *.html, *.sass) and Re-build library (without running tests)
gulp.task('build:watch-fast', ['build-watch-no-tests'], () => {
    gulp.watch([config.allTs, config.allHtml, config.allSass], ['build-watch-no-tests']);
});

/////////////////////////////////////////////////////////////////////////////
// Packaging Tasks
/////////////////////////////////////////////////////////////////////////////

// Prepare 'dist' folder for publication to NPM
gulp.task('npm-package', (cb) => {
    let pkgJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    let targetPkgJson = {};
    let fieldsToCopy = ['version', 'description', 'keywords', 'author', 'repository', 'license', 'bugs', 'homepage'];

    targetPkgJson['name'] = config.libraryName;

    //only copy needed properties from project's package json
    fieldsToCopy.forEach((field) => {
        targetPkgJson[field] = pkgJson[field];
    });

    targetPkgJson['main'] = `./bundles/${config.unscopedLibraryName}.umd.js`;
    targetPkgJson['module'] = `./esm5/${config.unscopedLibraryName}.es5.js`;
    targetPkgJson['typings'] = `./${config.unscopedLibraryName}.d.ts`;

    // defines project's dependencies as 'peerDependencies' for final users
    targetPkgJson.peerDependencies = {};
    Object.keys(pkgJson.dependencies).forEach((dependency) => {
        // versions are defined as '^' by default, but you can customize it by editing "dependenciesRange" in '.yo-rc.json' file
        targetPkgJson.peerDependencies[dependency] = `^${pkgJson.dependencies[dependency].replace(/[\^~><=]/,'')}`;
    });

    // copy the needed additional files in the 'dist' folder
    pump(
        [
            gulp.src(['README.md', 'LICENSE', 'CHANGELOG.md',
                `${config.buildDir}/lib/**/*.d.ts`,
                `${config.buildDir}/lib/**/*.metadata.json`
            ]),
            gulpFile('package.json', JSON.stringify(targetPkgJson, null, 2)),
            gulp.dest(config.outputDir)
        ], cb);
});

// Bundles the library as UMD/FESM bundles using RollupJS
gulp.task('rollup-bundle', (cb) => {
    return Promise.resolve()
        // Bundle lib.
        .then(() => {
            // Base configuration.
            const input = path.join(outputFolder, `${config.unscopedLibraryName}.js`);
            const globals = {
                // The key here is library name, and the value is the name of the global variable name
                // the window object.
                // See https://github.com/rollup/rollup/wiki/JavaScript-API#globals for more.

                // Angular dependencies 
                '@angular/core': 'ng.core',
                '@angular/common': 'ng.common',

                // Rxjs dependencies
                'rxjs/Subject': 'Rx',
                'rxjs/Observable': 'Rx',
                'rxjs/add/observable/fromEvent': 'Rx.Observable',
                'rxjs/add/observable/forkJoin': 'Rx.Observable',
                'rxjs/add/observable/of': 'Rx.Observable',
                'rxjs/add/observable/merge': 'Rx.Observable',
                'rxjs/add/observable/throw': 'Rx.Observable',
                'rxjs/add/operator/auditTime': 'Rx.Observable.prototype',
                'rxjs/add/operator/toPromise': 'Rx.Observable.prototype',
                'rxjs/add/operator/map': 'Rx.Observable.prototype',
                'rxjs/add/operator/filter': 'Rx.Observable.prototype',
                'rxjs/add/operator/do': 'Rx.Observable.prototype',
                'rxjs/add/operator/share': 'Rx.Observable.prototype',
                'rxjs/add/operator/finally': 'Rx.Observable.prototype',
                'rxjs/add/operator/catch': 'Rx.Observable.prototype',
                'rxjs/add/observable/empty': 'Rx.Observable.prototype',
                'rxjs/add/operator/first': 'Rx.Observable.prototype',
                'rxjs/add/operator/startWith': 'Rx.Observable.prototype',
                'rxjs/add/operator/switchMap': 'Rx.Observable.prototype',

                // ATTENTION:
                // Add any other dependency or peer dependency of your library here
                // This is required for UMD bundle users.
                // See https://github.com/tinesoft/generator-ngx-library/TROUBLESHOUTING.md if trouble

            };
            const rollupBaseConfig = {
                output: {
                    name: _.camelCase(config.libraryName),
                    sourcemap: true,
                    globals: globals
                },
                // List of dependencies
                // See https://github.com/rollup/rollup/wiki/JavaScript-API#external for more.
                external: Object.keys(globals),
                plugins: [
                    rollupCommonjs({
                        include: ['node_modules/rxjs/**']
                    }),
                    rollupSourcemaps(),
                    rollupNodeResolve({
                        jsnext: true,
                        module: true,
                        jail: distFolder, // to use final 'package.json' from 'dist/'
                    })
                ],
                onwarn: displayWarning
            };

            // UMD bundle.
            const umdConfig = _.merge({}, rollupBaseConfig, {
                input: input,
                output: {
                    format: 'umd',
                    file: path.join(distFolder, `bundles`, `${config.unscopedLibraryName}.umd.js`)
                }
            });

            // Minified UMD bundle.
            const minifiedUmdConfig = _.merge({}, rollupBaseConfig, {
                input: input,
                output: {
                    format: 'umd',
                    file: path.join(distFolder, `bundles`, `${config.unscopedLibraryName}.umd.min.js`),
                },
                plugins: rollupBaseConfig.plugins.concat([rollupUglify({})])
            });

            // flat module bundle.
            const fesm5config = _.merge({}, rollupBaseConfig, {
                input: input,
                output: {
                    format: 'es',
                    file: path.join(distFolder, 'esm5', `${config.unscopedLibraryName}.es5.js`),
                }
            });

            const allBundles = [
                umdConfig,
                minifiedUmdConfig,
                fesm5config
            ].map(cfg => rollup.rollup(cfg).then(bundle => bundle.write(cfg.output)));

            return Promise.all(allBundles)
                .then(() => gulpUtil.log('All bundles generated successfully.'))
        })
        .catch(e => {
            gulpUtil.log(gulpUtil.colors.red('rollup-bundling failed. See below for errors.\n'));
            gulpUtil.log(gulpUtil.colors.red(e));
            process.exit(1);
        });
});

/////////////////////////////////////////////////////////////////////////////
// Documentation Tasks
/////////////////////////////////////////////////////////////////////////////
gulp.task('build:doc', (cb) => {
    pump([
        gulp.src('src/**/*.ts'),
        gulpCompodoc({
            tsconfig: 'src/tsconfig.es5.json',
            hideGenerator: true,
            disableCoverage: true,
            output: `${config.docDir}/`
        })
    ], cb);
});

gulp.task('serve:doc', ['clean:doc'], (cb) => {
    pump([
        gulp.src('src/**/*.ts'),
        gulpCompodoc({
            tsconfig: 'src/tsconfig.es5.json',
            serve: true,
            output: `${config.docDir}/`
        })
    ], cb);
});

gulp.task('push:doc', () => {
    return execCmd('ngh', `--dir ${config.docDir}/ --message="chore(doc): :rocket: deploy new version"`);
});

/////////////////////////////////////////////////////////////////////////////
// Test Tasks
/////////////////////////////////////////////////////////////////////////////
gulp.task('test', (cb) => {
    const ENV = process.env.NODE_ENV = process.env.ENV = 'test';
    startKarmaServer(false, true, cb);
});

gulp.task('test:ci', ['clean'], (cb) => {
    runSequence('compile', 'test');
});

gulp.task('test:watch', (cb) => {
    const ENV = process.env.NODE_ENV = process.env.ENV = 'test';
    startKarmaServer(true, true, cb);
});

gulp.task('test:watch-no-cc', (cb) => { //no coverage (useful for debugging failing tests in browser)
    const ENV = process.env.NODE_ENV = process.env.ENV = 'test';
    startKarmaServer(true, false, cb);
});

/////////////////////////////////////////////////////////////////////////////
// Release Tasks
/////////////////////////////////////////////////////////////////////////////
gulp.task('changelog', (cb) => {
    pump(
        [
            gulp.src('CHANGELOG.md', {
                buffer: true
            }),
            gulpConventionalChangelog({
                preset: 'angular'
            }),
            gulp.dest('./')
        ], cb);
});

gulp.task('github-release', (cb) => {
    if (!argv.ghToken && !process.env.CONVENTIONAL_GITHUB_RELEASER_TOKEN) {
        gulpUtil.log(gulpUtil.colors.red(`You must specify a Github Token via '--ghToken' or set environment variable 'CONVENTIONAL_GITHUB_RELEASER_TOKEN' to allow releasing on Github`));
        throw new Error(`Missing '--ghToken' argument and environment variable 'CONVENTIONAL_GITHUB_RELEASER_TOKEN' not set`);
    }

    conventionalGithubReleaser({
            type: 'oauth',
            token: argv.ghToken || process.env.CONVENTIONAL_GITHUB_RELEASER_TOKEN
        }, {
            preset: 'angular'
        },
        cb);
});

gulp.task('bump-version', (cb) => {
    if (!argv.version) {
        gulpUtil.log(gulpUtil.colors.red(`You must specify which version to bump to (Possible values: 'major', 'minor', and 'patch')`));
        throw new Error(`Missing '--version' argument`);
    }

    pump(
        [
            gulp.src('./package.json'),
            gulpBump({
                type: argv.version
            }),
            gulp.dest('./'),
        ], cb);
});

gulp.task('commit-changes', (cb) => {
    let version = getPackageJsonVersion();
    pump(
        [
            gulp.src('.'),
            gulpGit.add(),
            gulpGit.commit(`chore(release): bump version number to ${version}`)
        ], cb);
});

gulp.task('push-changes', (cb) => {
    gulpGit.push('origin', 'master', cb);
});

gulp.task('create-new-tag', (cb) => {
    let version = `v${getPackageJsonVersion()}`;
    gulpGit.tag(version, `chore(release): :sparkles: :tada: create tag for version v${version}`, (error) => {
        if (error) {
            return cb(error);
        }
        gulpGit.push('origin', 'master', {
            args: '--tags'
        }, cb);
    });

});

// Build and then Publish 'dist' folder to NPM
gulp.task('npm-publish', ['build'], () => {
    return execExternalCmd('npm', `publish ${config.outputDir}`)
});

// Perfom pre-release checks (no actual release)
gulp.task('pre-release', cb => {
    readyToRelease();
    cb();
});

gulp.task('release', (cb) => {
    gulpUtil.log('# Performing Pre-Release Checks...');
    if (!readyToRelease()) {
        gulpUtil.log(gulpUtil.colors.red('# Pre-Release Checks have failed. Please fix them and try again. Aborting...'));
        cb();
    } else {
        gulpUtil.log(gulpUtil.colors.green('# Pre-Release Checks have succeeded. Continuing...'));
        runSequence(
            'bump-version',
            'changelog',
            'commit-changes',
            'push-changes',
            'create-new-tag',
            'github-release',
            'npm-publish',
            'deploy:doc',
            (error) => {
                if (error) {
                    gulpUtil.log(gulpUtil.colors.red(error.message));
                } else {
                    gulpUtil.log(gulpUtil.colors.green('RELEASE FINISHED SUCCESSFULLY'));
                }
                cb(error);
            });
    }
});

/////////////////////////////////////////////////////////////////////////////
// Check if all TS files start by the HUG Licence
/////////////////////////////////////////////////////////////////////////////
gulp.task('license', function () {
    return gulp.src(['**/*.ts', '!**/*.d.ts', '!**/node_modules/**'])
        .pipe(license({
            path: `${rootFolder}/header-license.txt`,
            blocking: true,
            logInfo: false,
            logError: true
        }));
});

/////////////////////////////////////////////////////////////////////////////
// Utility Tasks
/////////////////////////////////////////////////////////////////////////////

// Link 'dist' folder (create a local 'ng-scrollreveal' package that symlinks to it)
// This way, we can have the demo project declare a dependency on 'ng-scrollreveal' (as it should)
// and, thanks to 'npm link ng-scrollreveal' on demo project, be sure to always use the latest built
// version of the library ( which is in 'dist/' folder)
gulp.task('link', () => {
    return execExternalCmd('npm', 'link', {
        cwd: `${config.outputDir}`
    });
});

gulp.task('unlink', () => {
    return execExternalCmd('npm', 'unlink', {
        cwd: `${config.outputDir}`
    });
});

// Upload code coverage report to coveralls.io (will be triggered by Travis CI on successful build)
gulp.task('coveralls', (cb) => {
    pump(
        [
            gulp.src(`${config.coverageDir}/coverage.lcov`),
            gulpCoveralls()
        ], cb);
});

gulp.task('default', ['build']);

// Load additional tasks
gulpHub(['./config/gulp-tasks/*.js']);