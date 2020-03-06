const _ = require('lodash');
const path = require('path');
const shell = require('shelljs');
const program = require('commander');
const timecut = require('timecut');
const version = require('./package.json').version;

async function go(rootDir) {
    for (let url of shell.find(rootDir).filter(fn => path.basename(fn) === program.index)) {
        const templateVars = {
            ...program,
            folder: path.basename(path.dirname(url))
        };
        const output = path.normalize(path.join(path.dirname(url), outputTemplate(templateVars)));
        const config = {
            ..._.pick(program, ['selector', 'fps', 'start', 'duration']),
            url,
            output,
            inputOptions: ['-framerate', program.fps.toString()],
            outputOptions: ['-preset', 'medium', '-profile:v', 'high', '-tune', 'animation', '-crf', program.crf.toString()],
            pipeMode: false,
            frameCache: path.join(path.dirname(output), 'frames'),
            keepFrames: true,
            roundToEvenHeight: true,
            roundToEvenWidth: true,
        };
        // console.log(config);
        await timecut(config);
    }
    console.log("DONE.");
}

program
    .version(version)
    .usage('[options] <directory>')
    .description(
        'Capture a specific HTML element from each file. Start looking in <directory>, usually "."')
    .option(
        '-i, --index <filename.html>',
        'Name of HTML file to look for in each directory',
        'index.html'
    )
    .option('-e, --selector <selector>', 'CSS selector for HTML element to grab', '#container')
    .option(
        '-o, --output <filename>',
        'Output filename pattern, relative to the containing folder. You can use ' +
        'variables in this string such as {folder} for the folder name, and any other option here. ',
        '../{folder}.mp4'
    )
    .option('--fps <fps>', 'FPS to record at', parseInt, 30)
    .option('--start <sec>', 'Time to wait in seconds before starting capture', parseFloat, 0.1)
    .option('--duration <sec>', 'Duration to capture in seconds', parseFloat, 10)
    .option('--crf <0-51>', 'Set the Constant Rate Factor for H.264 quality. ' +
        'The range of the CRF scale is 0–51, where 0 is lossless, 23 is the default, and 51 is worst quality possible. ' +
        'A lower value generally leads to higher quality, and a subjectively sane range is 17–28. ' +
        'Consider 17 or 18 to be visually lossless or nearly so.', parseInt, 18)
    .parse(process.argv);

// Make a template function out of the passed template string, using single curly braces for
// variables
const outputTemplate = _.template(program.output, { interpolate: /{([\s\S]+?)}/g });

if (!program.args.length) {
    program.help();
} else {
    go(program.args[0]);
}
