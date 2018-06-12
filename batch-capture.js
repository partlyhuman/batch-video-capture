const assert = require('assert');
const path = require('path');
const shell = require('shelljs');
const program = require('commander');
const fileUrl = require('file-url');
const phantomPath = require('phantomjs-prebuilt').path;
const phantom = require('phantom');

const MAX_VIEWPORT = {width: 1920, height: 1080};

// Modernize setTimeout
function sleep(timeout) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    })
}

function imageFilename(directory, imageDir) {
    return path.join(imageDir, `${program.basename}_${path.basename(directory)}.jpg`);
}

async function renderPage(page, directory, imageDir) {
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
    // console.log(imageFilename(directory, imageDir));
    return await page.render(imageFilename(directory, imageDir), {format: 'jpeg', quality: program.quality});
}

async function go(rootDir) {
    const instance = await phantom.create([], {phantomPath});
    try {
        const page = await instance.createPage();
        for (const fn of shell.find(rootDir).filter(fn => path.basename(fn) === program.index)) {
            // console.log(path.dirname(fn));
            await renderPage(page, path.dirname(fn), rootDir);
        }
    }
    finally {
        await instance.exit();
    }
    console.log("DONE.");
}


program
    .usage('[options] <directory>')
    .description('Capture a specific HTML element from each file. Start looking in <directory>, usually "."')
    .option('-i, --index <filename.html>', 'Name of HTML file to look for in each directory', 'index.html')
    .option('-e, --el <selector>', 'CSS selector for HTML element to grab', '#container')
    .option('-b, --basename <filename>', 'Prefix for name of image to capture. Folder name will be appended.', 'backup')
    .option('-w, --wait <sec>', 'Time to wait in seconds', parseFloat, 0.5)
    .option('-q, --quality <0-100>', 'JPG quality', parseFloat, 90)
    .parse(process.argv);

if (!program.args.length) {
    program.help();
} else {
    go(program.args[0]);
}
