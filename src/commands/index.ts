import { Command, Flags, CliUx } from '@oclif/core';
import ytdl from 'ytdl-core';
import inquirer from 'inquirer';
import chalk from 'chalk';
import sanitize from 'sanitize-filename';
import { findYTSubConverter } from '../util/YTSubConvert';
import { Answers, download } from '../util/downloader';

class YtdlArchivalUtility extends Command {
	static description = 'An easy to use youtube-dl based downloader, mainly for VTuber content';

	static flags = {
		version: Flags.version({ char: 'v' }),
		help: Flags.help({ char: 'h' }),
		url: Flags.option({
			char: 'u',
			description: 'YouTube video url',
			parse: async (input) => (ytdl.validateURL(input) ? input : undefined),
		}),
		output: Flags.string({ char: 'o', description: 'manually set output file', helpValue: './downloads/filename' }),
		extension: Flags.enum({
			description: 'set output file extension, shorthand: --ext',
			input: ['ext'],
			default: 'auto',
			options: ['auto', 'mkv', 'mp4', 'webm'],
		}),
		ext: Flags.enum({
			hidden: true,
			default: undefined,
			options: ['auto', 'mkv', 'mp4', 'webm'],
			exclusive: ['extension'],
		}),
		keep: Flags.boolean({ char: 'k', description: 'keep all downloaded files' }),
		subtitles: Flags.boolean({ description: 'download subtitles and embed' }),
		'no-subs-embed': Flags.boolean({ description: 'don\'t embed subtitles' }),
		'no-ui': Flags.boolean({ description: 'use flags instead of UI', dependsOn: ['url'] }),
	};

	static args = [{ name: 'url' }];

	async run(): Promise<void> {
		const { args, flags } = await this.parse(YtdlArchivalUtility);

		const YTSubConverterCommand = await findYTSubConverter();

		const prompt = inquirer.createPromptModule();

		if (flags['no-ui']) {
			const ytdlInfo = await ytdl.getBasicInfo(flags.url!);

			if (!ytdlInfo) {
				CliUx.ux.log(`${chalk.red.bold('ERROR:')} Failed to get video info.`);
				CliUx.ux.exit(1);
			}

			const { videoDetails: info } = ytdlInfo;

			await download({
				...flags,
				output: sanitize(flags.output ?? `${info.uploadDate} - ${info.title}`, {
					replacement: '_',
				}),
			} as Answers, YTSubConverterCommand);
		} else {
			const answers = await prompt([
				{
					message: 'What\'s the YouTube video link?',
					type: 'input',
					name: 'url',
					// eslint-disable-next-line max-len
					when: !(args.url && ytdl.validateURL(args.url)) && !(flags.url && ytdl.validateURL(flags.url)),
					validate: (value: string) => ytdl.validateURL(value) || 'Invalid YouTube video url',
				},
				{
					message: 'Output filename:',
					type: 'input',
					name: 'output',
					// eslint-disable-next-line no-async-promise-executor
					default: (currentAnswers: { url?: string }) => new Promise(async (resolve, reject) => {
						const url = (args.url && ytdl.validateURL(args.url) ? args.url : undefined)
								?? (flags.url && ytdl.validateURL(flags.url) ? flags.url : undefined)
								?? currentAnswers.url;

						const ytdlInfo = await ytdl.getBasicInfo(url)
							.catch(reject);

						if (!ytdlInfo) {
							CliUx.ux.log(`${chalk.red.bold('ERROR:')} Failed to get video info.`);
							CliUx.ux.exit(1);
						}

						const { videoDetails: info } = ytdlInfo;
						resolve(`${info.uploadDate} - ${info.title}`);
					}),
					when: !flags.output,
				},
				{
					message: 'Download subtitles?',
					type: 'confirm',
					name: 'subtitles',
					when: typeof flags.subtitles === 'undefined',
				},
				{
					message: 'File extension',
					type: 'list',
					default: 'auto',
					choices: ['auto', 'mkv', 'mp4', 'webm'],
					name: 'extension',
					// eslint-disable-next-line max-len
					when: (currentAnswers) => !(flags.extension ?? flags.ext) && !(flags.subtitles || currentAnswers.subtitles),
				},
				{
					message: 'Additional options',
					type: 'checkbox',
					name: 'extra',
					choices: [
						{
							value: 'keep',
							name: 'Keep all downloaded files',
							checked: flags.keep,
							disabled: flags.keep,
						},
						{
							value: 'no-subs-embed',
							name: 'Don\'t embed subtitles',
							checked: flags['no-subs-embed'],
							disabled: flags['no-subs-embed'],
						},
					],
				},
			]);

			await download({
				url: (args.url && ytdl.validateURL(args.url) ? args.url : undefined)
				?? (flags.url && ytdl.validateURL(flags.url) ? flags.url : undefined)
				?? answers.url,
				output: sanitize(flags.output ?? answers.output, { replacement: '_' }),
				subtitles: flags.subtitles || answers.subtitles || false,
				extension: flags.extension ?? flags.ext ?? answers.output,
				keep: flags.keep || answers.extra.includes('keep'),
				'no-subs-embed': flags['no-subs-embed'] || answers.extra.includes('no-subs-embed'),
			}, YTSubConverterCommand);
		}
	}
}

export = YtdlArchivalUtility;
