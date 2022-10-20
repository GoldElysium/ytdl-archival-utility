ytdl-archival-utility
=====================

An easy to use YouTube based downloader, mainly for VTuber content

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/ytdl-archival-utility.svg)](https://npmjs.org/package/ytdl-archival-utility)
[![Downloads/week](https://img.shields.io/npm/dw/ytdl-archival-utility.svg)](https://npmjs.org/package/ytdl-archival-utility)
[![License](https://img.shields.io/npm/l/ytdl-archival-utility.svg)](https://github.com/GoldElysium/ytdl-archival-utility/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g ytdl-archival-utility
$ vdl COMMAND
running command...
$ vdl (--version|-v)
ytdl-archival-utility/0.0.2 win32-x64 node-v16.15.0
$ vdl --help [COMMAND]
USAGE
  $ vdl COMMAND
...
```
<!-- usagestop -->
```sh-session
$ npm install -g ytdl-archival-utility
$ vdownloader COMMAND
running command...
$ vdownloader (-v|--version|version)
ytdl-archival-utility/0.0.1 linux-x64 node-v16.10.0
$ vdownloader --help [COMMAND]
USAGE
  $ vdownloader COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`vdl [URL]`](#vdl-url)
* [`vdl help [COMMAND]`](#vdl-help-command)
* [`vdl version`](#vdl-version)

## `vdl [URL]`

An easy to use youtube-dl based downloader, mainly for VTuber content

```
USAGE
  $ vdl [URL] [-v] [-h] [-o <value>] [--extension auto|mkv|mp4|webm] [-k] [--subtitles] [--no-subs-embed] [--no-ui -u
    <value>]

FLAGS
  -h, --help                         Show CLI help.
  -k, --keep                         keep all downloaded files
  -o, --output=./downloads/filename  manually set output file
  -u, --url=<value>                  YouTube video url
  -v, --version                      Show CLI version.
  --extension=(auto|mkv|mp4|webm)    [default: auto] set output file extension, shorthand: --ext
  --no-subs-embed                    don't embed subtitles
  --no-ui                            use flags instead of UI
  --subtitles                        download subtitles and embed

DESCRIPTION
  An easy to use youtube-dl based downloader, mainly for VTuber content
```

_See code: [dist/commands/index.ts](https://github.com/GoldElysium/ytdl-archival-utility/blob/v0.0.2/dist/commands/index.ts)_

## `vdl help [COMMAND]`

display help for vdl

```
USAGE
  $ vdl help [COMMAND] [--all]

ARGUMENTS
  COMMAND  command to show help for

FLAGS
  --all  see all commands in CLI

DESCRIPTION
  display help for vdl
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.3.1/src/commands/help.ts)_

## `vdl version`

```
USAGE
  $ vdl version [--json] [--verbose]

FLAGS
  --verbose  Show additional information about the CLI.

GLOBAL FLAGS
  --json  Format output as json.

FLAG DESCRIPTIONS
  --verbose  Show additional information about the CLI.

    Additionally shows the architecture, node version, operating system, and versions of plugins that the CLI is using.
```

_See code: [@oclif/plugin-version](https://github.com/oclif/plugin-version/blob/v1.1.3/src/commands/version.ts)_
<!-- commandsstop -->

<!-- commandsstop -->
