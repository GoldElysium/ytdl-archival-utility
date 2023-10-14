import {
	Args, Command, Flags, ux,
} from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import sanitize from 'sanitize-filename';
import ytdl from 'ytdl-core';

import { findYTSubConverter } from '../util/YTSubConvert';
import { Answers, download } from '../util/downloader';

class YtdlArchivalUtility extends Command {
	static args = {
		url: Args.string(),
	};

	static description = 'An easy to use youtube-dl based downloader, mainly for VTuber content';

	static flags = {
		ext: Flags.string({
			default: undefined,
			exclusive: ['extension'],
			hidden: true,
			options: ['auto', 'mkv', 'mp4', 'webm'],
		}),
		extension: Flags.string({
			default: 'auto',
			description: 'set output file extension, shorthand: --ext',
			input: ['ext'],
			options: ['auto', 'mkv', 'mp4', 'webm'],
		}),
		help: Flags.help({ char: 'h' }),
		keep: Flags.boolean({ char: 'k', description: 'keep all downloaded files' }),
		'no-subs-embed': Flags.boolean({ description: 'don\'t embed subtitles' }),
		'no-ui': Flags.boolean({ dependsOn: ['url'], description: 'use flags instead of UI' }),
		output: Flags.string({ char: 'o', description: 'manually set output file', helpValue: './downloads/filename' }),
		subtitles: Flags.boolean({ description: 'download subtitles and embed' }),
		url: Flags.string({
			char: 'u',
			description: 'YouTube video url',
			parse: async (input) => (ytdl.validateURL(input) ? input : undefined),
		}),
		version: Flags.version({ char: 'v' }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(YtdlArchivalUtility);

		const YTSubConverterCommand = await findYTSubConverter();

		const prompt = inquirer.createPromptModule();

		if (flags['no-ui']) {
			const ytdlInfo = await ytdl.getBasicInfo(flags.url!);

			if (!ytdlInfo) {
				ux.log(`${chalk.red.bold('ERROR:')} Failed to get video info.`);
				ux.exit(1);
			}

			const { videoDetails: info } = ytdlInfo;

			await download({
				...flags,
				output: sanitize(flags.output ?? `${info.publishDate} - ${info.title}`, {
					replacement: '_',
				}),
			} as Answers, YTSubConverterCommand);
		} else {
			const answers = await prompt([
				{
					message: 'What\'s the YouTube video link?',
					name: 'url',
					type: 'input',
					validate: (value: string) => ytdl.validateURL(value) || 'Invalid YouTube video url',
					// eslint-disable-next-line max-len
					when: !(args.url && ytdl.validateURL(args.url)) && !(flags.url && ytdl.validateURL(flags.url)),
				},
				{
					// eslint-disable-next-line no-async-promise-executor
					default: (currentAnswers: { url?: string }) => new Promise(async (resolve, reject) => {
						const url = (args.url && ytdl.validateURL(args.url) ? args.url : undefined)
								?? (flags.url && ytdl.validateURL(flags.url) ? flags.url : undefined)
								?? currentAnswers.url;

						if (!url) {
							ux.log(`${chalk.red.bold('ERROR:')} No url.`);
							ux.exit(1);
						}

						const ytdlInfo = await ytdl.getBasicInfo(url)
							.catch(reject);

						if (!ytdlInfo) {
							ux.log(`${chalk.red.bold('ERROR:')} Failed to get video info.`);
							ux.exit(1);
						}

						const { videoDetails: info } = ytdlInfo;
						resolve(`${info.uploadDate.split('T')[0]} - ${info.title}`);
					}),
					message: 'Output filename:',
					name: 'output',
					type: 'input',
					when: !flags.output,
				},
				{
					message: 'Download subtitles?',
					name: 'subtitles',
					type: 'confirm',
					when: flags.subtitles === undefined,
				},
				{
					choices: ['auto', 'mkv', 'mp4', 'webm'],
					default: 'auto',
					message: 'File extension',
					name: 'extension',
					type: 'list',
					// eslint-disable-next-line max-len
					when: (currentAnswers) => !(flags.extension ?? flags.ext) && !(flags.subtitles || currentAnswers.subtitles),
				},
				{
					choices: [
						{
							checked: flags.keep,
							disabled: flags.keep,
							name: 'Keep all downloaded files',
							value: 'keep',
						},
						{
							checked: flags['no-subs-embed'],
							disabled: flags['no-subs-embed'],
							name: 'Don\'t embed subtitles',
							value: 'no-subs-embed',
						},
					],
					message: 'Additional options',
					name: 'extra',
					type: 'checkbox',
				},
			]);

			await download({
				extension: flags.extension ?? flags.ext ?? answers.output,
				keep: flags.keep || answers.extra.includes('keep'),
				'no-subs-embed': flags['no-subs-embed'] || answers.extra.includes('no-subs-embed'),
				output: sanitize(flags.output ?? answers.output, { replacement: '_' }),
				subtitles: flags.subtitles || answers.subtitles || false,
				url: (args.url && ytdl.validateURL(args.url) ? args.url : undefined)
				?? (flags.url && ytdl.validateURL(flags.url) ? flags.url : undefined)
				?? answers.url,
			}, YTSubConverterCommand);
		}
	}
}

export = YtdlArchivalUtility;
