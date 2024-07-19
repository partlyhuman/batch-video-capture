# batch-video-capture

This is a commandline tool to grab correctly-cropped videos
of the same HTML element found in many copies of the same html file
in multiple subdirectories, and drop these shots in each directory.


### Installation

[FFmpeg](https://ffmpeg.org/download.html) must be installed and in your path.

Run
 `npm install -g git+https://github.com/partlyhuman/batch-video-capture` 
from the command line.

### Usage

Run `batch-video-capture`, giving it options and a directory root 
to start looking for files in. You often use `.` for the current
directory. All other arguments are optional.

Run with no arguments or `batch-video-capture --help` to see all available
options.

```
  Usage: batch-video-capture [options] <directory>

  Capture a specific HTML element from each file. Start looking in <directory>, usually "."

  Options:

    -V, --version                output the version number
    -i, --index <filename.html>  Name of HTML file to look for in each directory (default: index.html)
    -e, --selector <selector>    CSS selector for HTML element to grab (default: #container)
    -o, --output <filename>      Output filename pattern, relative to the containing folder. You can use variables in this string such as {folder} for the folder name, and any other option here.  (default: ../{folder}.mp4)
    --fps <fps>                  FPS to record at (default: 30)
    --start <sec>                Time to wait in seconds before starting capture (default: 0)
    --duration <sec>             Duration to capture in seconds (default: 10)
    --crf <0-51>                 Set the Constant Rate Factor for H.264 quality. The range of the CRF scale is 0–51, where 0 is lossless, 23 is the default, and 51 is worst quality possible. A lower value generally leads to higher quality, and a subjectively sane range is 17–28. Consider 17 or 18 to be visually lossless or nearly so. (default: 18)
    -k, --keep                   Keep the frame images after encoding
    -h, --help                   output usage information

```
