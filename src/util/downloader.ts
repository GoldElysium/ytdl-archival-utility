import { ux } from '@oclif/core';
import axios from 'axios';
import chalk from 'chalk';
import ProgressBar from 'cli-progress';
import Debug from 'debug';
import ffmpegPath from 'ffmpeg-static';
import { path as ffprobePath } from 'ffprobe-static';
import Ffmpeg from 'fluent-ffmpeg';
import langs from 'langs';
import child_process from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import stream from 'node:stream';
import util from 'node:util';
import ytdl from 'ytdl-core';

const pipeline = util.promisify(stream.pipeline);
const exec = util.promisify(child_process.exec);

const debug = Debug('vdl');

export interface Answers {
	extension: string;
	keep: boolean;
	'no-subs-embed': boolean;
	output: string;
	subtitles: boolean;
	url: string;
}

export async function download(answers: Answers, YTSubConverterCommand: string): Promise<void> {
	debug(answers);

	if (!ffmpegPath || !ffprobePath) {
		ux.log(`${chalk.red.bold('ERROR:')} Cannot find ffmpeg/ffprobe.`);
		ux.exit(1);
	}

	// Set paths for fluent-ffmpeg from static binaries
	debug(`Ffmpeg path: ${ffmpegPath}`);
	debug(`Ffprobe path: ${ffprobePath}`);
	Ffmpeg.setFfmpegPath(ffmpegPath);
	Ffmpeg.setFfprobePath(ffprobePath);

	const info = await ytdl.getInfo(answers.url)
		.catch(() => {
			ux.log(`${chalk.red.bold('ERROR:')} Failed to get video info.`);
			ux.exit(1);
		});

	if (!info) {
		return;
	}

	// Get the formats to determine the file container
	const videoFormat = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
	const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

	const captions = info.player_response.captions?.playerCaptionsTracklistRenderer.captionTracks;

	const downloadBar = new ProgressBar.MultiBar(
		{ hideCursor: true },
		ProgressBar.Presets.shades_classic,
	);
	ux.action.start('Downloading video');

	// Download inside a promise, so it can be awaited
	const videoDownloadPromise = new Promise<void>((resolve) => {
		debug('Starting download');
		const videoProgress = downloadBar.create(100, 0, { filename: `${answers.output}.${videoFormat.container}` });

		let firstRun = true;

		const videoDownload = ytdl.downloadFromInfo(info, {
			quality: 'highestvideo',
		});

		videoDownload.on('progress', (_, downloaded, total) => {
			if (firstRun) {
				videoProgress.setTotal(total);
				firstRun = false;
			}
			videoProgress.update(downloaded);
		});

		videoDownload.pipe(fs.createWriteStream(path.resolve(`${answers.output}.${videoFormat.container}`)));

		videoDownload.on('finish', () => {
			debug('Video finished downloading');
			resolve();
		});

		videoDownload.on('end', () => {
			debug('Video finished downloading');
			resolve();
		});
	});

	const audioDownloadPromise = new Promise<void>((resolve) => {
		const audioProgress = downloadBar.create(100, 0, { filename: `${answers.output}.${audioFormat.container}` });

		let firstRun = true;

		const audioDownload = ytdl.downloadFromInfo(info, {
			quality: 'highestaudio',
		});

		audioDownload.on('progress', (_, downloaded, total) => {
			if (firstRun) {
				audioProgress.setTotal(total);
				firstRun = false;
			}
			audioProgress.update(downloaded);
		});

		audioDownload.pipe(fs.createWriteStream(path.resolve(`${answers.output}.${audioFormat.container}`)));

		audioDownload.on('finish', () => {
			debug('Audio finished downloading');
			resolve();
		});

		audioDownload.on('end', () => {
			debug('Audio finished downloading');
			resolve();
		});
	});

	const { thumbnails } = info.videoDetails;
	let thumbnailDownload = Promise.resolve();

	if (thumbnails.length > 0) {
		const { url } = thumbnails.at(-1)!;
		thumbnailDownload = pipeline(
			(await axios.get(url, { responseType: 'stream' })).data,
			fs.createWriteStream(path.resolve(`${answers.output}.${url.split('/').pop()?.split('.').pop()
				?.split('?')[0] ?? 'jpg'}`)),
		);
		debug('Added thumbnail download');
	}

	const subtitleDownloadPromise = (async () => {
		if (captions && answers.subtitles) {
			const promises: Promise<void>[] = [];
			for (const caption of captions) {
				promises.push((async () => {
					debug(caption.baseUrl);

					// Download subtitles in srv3 format (YT proprietary format afaik)
					await pipeline(
						(await axios.get(`${caption.baseUrl}&fmt=srv3`, { responseType: 'stream' })).data,
						fs.createWriteStream(path.resolve(`${answers.output}.${caption.name.simpleText}.srv3`)),
					);

					debug(`Converting ${caption.name.simpleText}`);
					// eslint-disable-next-line max-len
					// Convert the subtitle from .srv3 to .ass with the --visual parameter to recreate how it'd look on YT
					try {
						await exec(
							`${YTSubConverterCommand} --visual "${answers.output}.${caption.name.simpleText}.srv3"`,
							{
								cwd: process.cwd(),
							},
						);
						if (!answers.keep) {
							try {
								fs.unlinkSync(path.resolve(`${answers.output}.${caption.name.simpleText}.srv3`));
							} catch {}
						}
						debug(`Finished downloading and converting ${caption.name.simpleText}`);
					} catch (error) {
						debug(error);
						ux.log(`${chalk.red.bold('ERROR:')} Failed to download subtitles.`);
						ux.exit(1);
					}
				})());
			}
			await Promise.all(promises);
		}
	})();

	await Promise.all([
		videoDownloadPromise,
		audioDownloadPromise,
		thumbnailDownload,
		subtitleDownloadPromise,
	]);
	debug('Done downloading');

	downloadBar.stop();
	ux.action.stop();

	ux.action.start('Merging files');

	// Figure out a file extension, default to MKV
	const fileExt = answers.extension === 'auto' ? 'mkv' : answers.extension;

	// Add all common metadata
	/* eslint-disable unicorn/consistent-destructuring */
	const mergeCommand = Ffmpeg({
		logger: {
			debug: () => {},
			error: debug,
			info: debug,
			warn: debug,
		},
	})
		.outputOptions('-metadata', `title=${info.videoDetails.title}`)
		.outputOptions('-metadata', `author=${info.videoDetails.ownerChannelName}`)
		.outputOptions('-metadata', `artist=${info.videoDetails.ownerChannelName}`)
		.outputOptions('-metadata', `description=${info.videoDetails.description}`)
		.outputOptions('-metadata', `comment=${info.videoDetails.description}`)
		.outputOptions('-metadata', 'network=YouTube')
		.outputOptions('-map', '0')
		.outputOptions('-map', '1');
	/* eslint-enable */

	// Add video and audio stream
	const videoFile = path.resolve(`${answers.output}.${videoFormat.container}`);
	const audioFile = path.resolve(`${answers.output}.${audioFormat.container}`);

	debug(`Added input: ${videoFile}`);
	debug(`Added input: ${audioFile}`);

	mergeCommand
		.addInput(videoFile)
		.addInput(audioFile);

	if (fileExt === 'mkv') {
		mergeCommand.videoCodec('copy');
		mergeCommand.audioCodec('copy');
	}

	// Add the subtitles
	if (answers.subtitles && !answers['no-subs-embed'] && captions) {
		for (const [i, caption] of captions.entries()) {
			const file = path.resolve(`${answers.output}.${caption.name.simpleText}.ass`);
			debug(`Added input: ${file}`);
			mergeCommand.addInput(file);
			const languageCode = langs.where('1', caption.languageCode.toString())!['2'];
			mergeCommand
				.outputOptions(`-metadata:s:s:${i}`, `language=${languageCode}`)
				// Add 2 because of the video and audio file
				.outputOptions('-map', `${i + 2}`);
		}
	}

	mergeCommand
		.save(path.resolve(`${answers.output}.${fileExt}`))
		.on('start', (commandLine) => {
			debug(`Spawned Ffmpeg with command: ${commandLine}`);
		})
		.on('error', (error) => {
			debug(error);
			ux.log(`${chalk.red.bold('ERROR:')} Failed to merge files.`);
			ux.exit(1);
		})
		.on('finish', () => {
			if (!answers.keep) {
				try {
					fs.unlinkSync(videoFile);
					fs.unlinkSync(audioFile);
				} catch {}

				if (answers.subtitles && !answers['no-subs-embed'] && captions) {
					for (const caption of captions) {
						try {
							fs.unlinkSync(path.resolve(`${answers.output}.${caption.name.simpleText}.ass`));
						} catch {}
					}
				}
			}

			ux.action.stop();
			ux.log(`${chalk.green.bold()}Finished!`);
		})
		.on('end', () => {
			if (!answers.keep) {
				try {
					fs.unlinkSync(videoFile);
					fs.unlinkSync(audioFile);
				} catch {}

				if (answers.subtitles && !answers['no-subs-embed'] && captions) {
					for (const caption of captions) {
						try {
							fs.unlinkSync(path.resolve(`${answers.output}.${caption.name.simpleText}.ass`));
						} catch {}
					}
				}
			}
			ux.action.stop();
			ux.log(`${chalk.green.bold()}Finished!`);
		});
}
