const _ = require('lodash');
const assert = require('assert');
const path = require('path');
const shell = require('shelljs');
const program = require('commander');
const fileUrl = require('file-url');
const phantom = require('phantom');
const phantomPath = require('phantomjs-prebuilt').path;
const promisify = require('util').promisify;
const im = require('gm').subClass({imageMagick: true});
const version = require('./package.json').version;
const MAX_VIEWPORT = {width: 1920, height: 1080};

// Modernize setTimeout
function sleep(timeout) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    })
}

// Make GM use promises
im.prototype.write = promisify(im.prototype.write);

async function renderPage(page, directory) {
    const uri = fileUrl(path.join(directory, program.index));
    console.log(`Loading ${uri}`);
    const status = await page.open(uri);
    assert(status === 'success');
    await page.property('viewportSize', MAX_VIEWPORT);
    await sleep(program.wait * 1000);
    const bounds = await page.evaluate(function (selector) {
        return document.querySelector(selector).getBoundingClientRect();
    }, program.el);
    await page.property('clipRect', bounds);
    const templateVars = Object.assign({folder: path.basename(directory)}, _.pick(program, ['quality', 'index', 'el', 'wait']));
    const outputFilename = path.join(directory, outputTemplate(templateVars));
    console.log(`Capturing to image ${outputFilename}`);
    await page.render(outputFilename, {format: 'png'});
    await im(outputFilename)
        .setFormat('jpeg')
        .quality(100)
        .define(`jpeg:extent=${parseInt(program.targetsize) * 1000}`)
        .noProfile()
        .write(outputFilename);
}

async function go(rootDir) {
    const instance = await phantom.create([], {phantomPath});
    try {
        const page = await instance.createPage();
        for (const fn of shell.find(rootDir).filter(fn => path.basename(fn) === program.index)) {
            // console.log(path.dirname(fn));
            await renderPage(page, path.dirname(fn));
        }
    }
    finally {
        await instance.exit();
    }
    console.log("DONE.");
}


program
    .version(version)
    .usage('[options] <directory>')
    .description('Capture a specific HTML element from each file. Start looking in <directory>, usually "."')
    .option('-i, --index <filename.html>', 'Name of HTML file to look for in each directory', 'index.html')
    .option('-e, --el <selector>', 'CSS selector for HTML element to grab', '#container')
    .option('-o, --output <filename>', 'Output filename pattern, relative to the containing folder. You can use' +
        'variables in this string such as {folder} for the folder name, and relative paths', '../backup_{folder}.jpg')
    .option('-w, --wait <sec>', 'Time to wait in seconds', parseFloat, 0.1)
    .option('-t, --targetsize <kb>', 'Output to an image with file size equal to the target size in kb', 35)
    // .option('-q, --quality <0-100>', 'JPG quality', parseFloat, 100)
    .parse(process.argv);

// Make a template function out of the passed template string, using single curly braces for variables
const outputTemplate = _.template(program.output, {interpolate: /{([\s\S]+?)}/g});

if (!program.args.length) {
    program.help();
} else {
    go(program.args[0]);
}
