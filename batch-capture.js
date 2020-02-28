const _ = require('lodash');
const assert = require('assert');
const path = require('path');
const shell = require('shelljs');
const program = require('commander');
const fileUrl = require('file-url');
const phantom = require('phantom');
const phantomPath = require('phantomjs-prebuilt').path;
const imagemin = require('imagemin');
const imagemin_pngquant = require('imagemin-pngquant');
const imagemin_mozjpeg = require('imagemin-mozjpeg');
const version = require('./package.json').version;
const MAX_VIEWPORT = {width: 1920, height: 1080};

// Modernize setTimeout
function sleep(timeout) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    })
}

async function renderPage(page, directory) {
    const uri = fileUrl(path.join(directory, program.index));
    console.log(`Loading ${uri}`);
    const status = await page.open(uri);
    assert(status === 'success');
    await page.property('viewportSize', MAX_VIEWPORT);

    await sleep(program.wait * 1000);

    const templateVars = Object.assign({folder: path.basename(directory)}, _.pick(program, ['quality', 'index', 'el', 'wait']));
    const outputFilename = path.normalize(path.join(directory, outputTemplate(templateVars)));
    const outputPath = path.dirname(outputFilename);
    const format = (path.extname(outputFilename).toLowerCase() == '.png') ? 'png' : 'jpeg';
    shell.mkdir('-p', outputPath);
    console.log(`Capturing to image ${outputFilename}`);

    const bounds = await page.evaluate(function (selector) {
        return document.querySelector(selector).getBoundingClientRect();
    }, program.el);
    await page.property('clipRect', bounds);
    await page.render(outputFilename, {format, quality: '100'});

    const destination = path.join(path.dirname(outputFilename), 'optimized');
    console.log(`Compressing into ${destination}...`);

    await imagemin([outputFilename], {
        destination,
        plugins: [
            imagemin_mozjpeg({quality: program.quality}),
            imagemin_pngquant({strip: true, quality: [0, program.quality/100.0]}),
        ]
    });
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
    .option('-o, --output <filename>', 'Output filename pattern, relative to the containing folder. You can use ' +
        'variables in this string such as {folder} for the folder name, {index} {el} and {wait} from above options. ' +
        'Supported file types are .png and .jpg.', '../backup_{folder}.jpg')
    .option('-w, --wait <sec>', 'Time to wait in seconds', parseFloat, 0.1)
    //.option('-t, --targetsize <kb>', 'Output to an image with file size equal to the target size in kb', 35)
    .option('-q, --quality <0-100>', 'Compressed image quality', parseFloat, 75)
    .parse(process.argv);

// Make a template function out of the passed template string, using single curly braces for variables
const outputTemplate = _.template(program.output, {interpolate: /{([\s\S]+?)}/g});

if (!program.args.length) {
    program.help();
} else {
    go(program.args[0]);
}
