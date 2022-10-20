import ytdl from 'ytdl-core';
import Ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { path as ffprobePath } from 'ffprobe-static';
import Debug from 'debug';
import { CliUx } from '@oclif/core';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import ProgressBar from 'cli-progress';
import got from 'got';
import child_process from 'node:child_process';
import langs from 'langs';
import stream from 'node:stream';
import util from 'node:util';

const pipeline = util.promisify(stream.pipeline);

const debug = Debug('vdl');

export interface Answers {
	url: string;
	output: string;
	subtitles: boolean;
	extension: string;
	keep: boolean;
	'no-subs-embed': boolean;
}

export async function download(answers: Answers, YTSubConverterCommand: string): Promise<void> {
	debug(answers);

	// Set paths for fluent-ffmpeg from static binaries
	debug(`Ffmpeg path: ${ffmpegPath}`);
	debug(`Ffprobe path: ${ffprobePath}`);
	Ffmpeg.setFfmpegPath(ffmpegPath);
	Ffmpeg.setFfprobePath(ffprobePath);

	const info = await ytdl.getInfo(answers.url)
		.catch(() => {
			CliUx.ux.log(`${chalk.red.bold('ERROR:')} Failed to get video info.`);
			CliUx.ux.exit(1);
		});

	if (!info) {
		return;
	}

	// Get the formats to determine the file container
	const videoFormat = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
	const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

	const captions = info.player_response.captions?.playerCaptionsTracklistRenderer.captionTracks;

	const downloadBar = new ProgressBar.MultiBar({ hideCursor: true },
		ProgressBar.Presets.shades_classic);
	CliUx.ux.action.start('Downloading video');

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
		const { url } = thumbnails[thumbnails.length - 1];
		thumbnailDownload = pipeline(
			got.stream(url),
			fs.createWriteStream(path.resolve(`${answers.output}.${url.split('/').pop()?.split('.').pop()
				?.split('?')[0] ?? 'jpg'}`)),
		);
		debug('Added thumbnail download');
	}

	const subtitleDownloadPromise = new Promise<void>((resolve) => {
		if (captions && answers.subtitles) {
			const promises: Promise<void>[] = [];
			for (const caption of captions) {
				promises.push(new Promise((resolvePromise) => {
					debug(caption.baseUrl);
					// Download subtitles in srv3 format (YT proprietary format afaik)
					pipeline(
						got.stream(`${caption.baseUrl}&fmt=srv3`),
						fs.createWriteStream(path.resolve(`${answers.output}.${caption.name.simpleText}.srv3`)),
					).then(() => {
						debug(`Converting ${caption.name.simpleText}`);
						// eslint-disable-next-line max-len
						// Convert the subtitle from .srv3 to .ass with the --visual parameter to recreate how it'd look on YT
						child_process.exec(`${YTSubConverterCommand} --visual "${answers.output}.${caption.name.simpleText}.srv3"`,
							{
								cwd: process.cwd(),
							},
							(error) => {
								if (error) {
									debug(error);
									CliUx.ux.log(`${chalk.red.bold('ERROR:')} Failed to download subtitles.`);
									CliUx.ux.exit(1);
								}
								if (!answers.keep) {
									try {
										fs.unlinkSync(path.resolve(`${answers.output}.${caption.name.simpleText}.srv3`));
									} catch {}
								}
								debug(`Finished downloading and converting ${caption.name.simpleText}`);
								resolvePromise();
							});
					}).catch((error) => {
						debug(error);
						CliUx.ux.log(`${chalk.red.bold('ERROR:')} Failed to download subtitles.`);
						CliUx.ux.exit(1);
					});
				}));
			}
			Promise.all(promises).then(() => resolve());
		} else resolve();
	});

	await Promise.all([
		videoDownloadPromise,
		audioDownloadPromise,
		thumbnailDownload,
		subtitleDownloadPromise,
	]);
	debug('Done downloading');

	downloadBar.stop();
	CliUx.ux.action.stop();

	CliUx.ux.action.start('Merging files');

	// Figure out a file extension, default to MKV
	const fileExt = answers.extension === 'auto' ? 'mkv' : answers.extension;

	// Add all common metadata
	/* eslint-disable unicorn/consistent-destructuring */
	const mergeCommand = Ffmpeg({
		logger: {
			debug: () => {},
			info: debug,
			warn: debug,
			error: debug,
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
			const languageCode = langs.where('1', caption.languageCode)!['2'];
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
			CliUx.ux.log(`${chalk.red.bold('ERROR:')} Failed to merge files.`);
			CliUx.ux.exit(1);
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

			CliUx.ux.action.stop();
			CliUx.ux.log(`${chalk.green.bold()}Finished!`);
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
			CliUx.ux.action.stop();
			CliUx.ux.log(`${chalk.green.bold()}Finished!`);
		});
}
