import { Command, flags as Flags } from '@oclif/command';
import * as ytdl from 'ytdl-core';
import * as inquirer from 'inquirer';
import { cli } from 'cli-ux';
import chalk = require('chalk');
import { firstInit } from './util';
import { Answers, download } from './downloader';

class YtdlArchivalUtility extends Command {
	static description = 'An easy to use youtube-dl based downloader, mainly for VTuber content';

	static flags = {
		version: Flags.version({ char: 'v' }),
		help: Flags.help({ char: 'h' }),
		url: Flags.option({
			char: 'u',
			description: 'YouTube video url',
			parse: (input) => (ytdl.validateURL(input) ? input : undefined),
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
		'disable-backup': Flags.boolean({ description: 'disable keeping a backup in case file modifications are needed' }),
		subtitles: Flags.boolean({ description: 'download subtitles and embed' }),
		'no-subs-embed': Flags.boolean({ description: 'don\'t embed subtitles' }),
		'no-ui': Flags.boolean({ description: 'use flags instead of UI', dependsOn: ['url'] }),
	};

	static args = [{ name: 'url' }];

	async run(): Promise<void> {
		const { args, flags } = this.parse(YtdlArchivalUtility);

		await firstInit();

		const prompt = inquirer.createPromptModule();

		if (flags['no-ui']) download(flags as Answers);
		else {
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
							cli.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
							cli.exit(1);
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
					message: 'File extension (If you don\'t select MKV, subtitles will be burned in)',
					type: 'list',
					default: 'auto',
					choices: ['auto', 'mkv', 'mp4', 'webm'],
					name: 'extension',
					when: !(flags.extension ?? flags.ext),
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
							value: 'disable-backup',
							name: 'Disable keeping a backup in case file modifications are needed',
							checked: flags['disable-backup'],
							disabled: flags['disable-backup'],
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

			download({
				url: (args.url && ytdl.validateURL(args.url) ? args.url : undefined)
				?? (flags.url && ytdl.validateURL(flags.url) ? flags.url : undefined)
				?? answers.url,
				output: flags.output ?? answers.output,
				subtitles: flags.subtitles || answers.subtitles || false,
				extension: flags.extension ?? flags.ext ?? answers.output,
				keep: flags.keep || answers.extra.includes('keep'),
				'disable-backup': flags['disable-backup'] || answers.extra.includes('disable-backup'),
				'no-subs-embed': flags['no-subs-embed'] || answers.extra.includes('no-subs-embed'),
			});
		}
	}
}

export = YtdlArchivalUtility;
