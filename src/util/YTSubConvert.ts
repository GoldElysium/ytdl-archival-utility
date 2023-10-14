import { ux } from '@oclif/core';
import axios from 'axios';
import chalk from 'chalk';
import commandExists from 'command-exists';
import Debug from 'debug';
import * as fs from 'node:fs';
import * as path from 'node:path';

const debug = Debug('vdl');

const { platform } = process;

// eslint-disable-next-line import/prefer-default-export
export async function findYTSubConverter(): Promise<string> {
	if (!fs.existsSync(path.resolve(__dirname, '../../.deps'))) {
		fs.mkdirSync(path.resolve(__dirname, '../../.deps'));
	}

	// Only maps needed items
	type GithubApiResponse = {
		assets: {
			browser_download_url: string;
			name: string;
		}[];
	};

	let wineExists = false;
	await commandExists('wine').then(() => { wineExists = true; }).catch(() => { wineExists = false; });

	if (platform === 'win32') {
		if (!fs.existsSync(path.resolve(__dirname, '../../.deps/YTSubConverter.exe'))) {
			debug('Failed to find YTSubConverter.exe');
			// ux.exit(0);
			ux.action.start('Downloading YTSubConverter.exe', 'downloading', { stdout: true });

			const githubApiResponse = await axios.get<GithubApiResponse>('https://api.github.com/repos/arcusmaximus/YTSubConverter/releases/latest');
			debug(githubApiResponse.data);
			const asset = githubApiResponse.data.assets.find((item) => item.name.endsWith('.exe'));
			debug(asset);
			if (!asset) {
				ux.log(`${chalk.red.bold('ERROR:')} Could not find YTSubConverter.exe download link, please try again.`);
				ux.exit(0);
			}

			const writeStream = fs.createWriteStream(path.resolve(__dirname, '../../.deps/YTSubConverter.exe'));
			const response = await axios.get(asset!.browser_download_url, { responseType: 'stream' })
				.catch((error) => {
					debug(error);
					ux.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
					ux.exit(1);
				});

			response.data.pipe(writeStream)
				.on('error', (error: never) => {
					debug(error);
					ux.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
					ux.exit(1);
				});

			ux.action.stop();
		}

		debug('YTSubConverter was found!');
		return `${path.resolve(__dirname, '../../.deps/YTSubConverter.exe')}`;
	}
	if (platform === 'darwin') {
		// TODO: Check if YTSubConverter.app is in the deps folder

		if (wineExists) {
			if (!fs.existsSync(path.resolve(__dirname, '../../.deps/YTSubConverter.exe'))) {
				ux.action.start('Downloading YTSubConverter.exe', 'downloading', { stdout: true });

				const githubApiResponse = await axios.get<GithubApiResponse>('https://api.github.com/repos/arcusmaximus/YTSubConverter/releases/latest');
				debug(githubApiResponse.data);
				const asset = githubApiResponse.data.assets.find((item) => item.name.endsWith('.exe'));
				debug(asset);
				if (!asset) {
					ux.log(`${chalk.red.bold('ERROR:')} Could not find YTSubConverter.exe download link, please try again.`);
					ux.exit(0);
				}

				const writeStream = fs.createWriteStream(path.resolve(__dirname, '../../.deps/YTSubConverter.exe'));
				const response = await axios.get(asset!.browser_download_url, { responseType: 'stream' })
					.catch((error) => {
						debug(error);
						ux.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
						ux.exit(1);
					});

				response.data.pipe(writeStream)
					.on('error', (error: never) => {
						debug(error);
						ux.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
						ux.exit(1);
					});

				ux.action.stop();
			}

			debug('YTSubConverter was found!');
			return `wine ${path.resolve(__dirname, '../../.deps/YTSubConverter.exe')}`;
		}

		const { data: githubApiResponse }: { data: GithubApiResponse } = await axios.get<GithubApiResponse>('https://api.github.com/repos/arcusmaximus/YTSubConverter/releases/latest');
		// ! TODO: Remove directive below
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const macOsUrl = githubApiResponse.assets.find((item) => item.name.endsWith('.dmg'));
		// TODO: Mount DMG and copy folder to .deps
		return '';
	}

	if (!wineExists) {
		ux.log(`${chalk.red.bold('ERROR:')} Wine was not found, please install it first`);
		ux.exit(0);
	}

	if (!fs.existsSync(path.resolve(__dirname, '../../.deps/YTSubConverter.exe'))) {
		ux.action.start('Downloading YTSubConverter.exe', 'downloading', { stdout: true });

		const githubApiResponse = await axios.get<GithubApiResponse>('https://api.github.com/repos/arcusmaximus/YTSubConverter/releases/latest');
		debug(githubApiResponse.data);
		const asset = githubApiResponse.data.assets.find((item) => item.name.endsWith('.exe'));
		debug(asset);
		if (!asset) {
			ux.log(`${chalk.red.bold('ERROR:')} Could not find YTSubConverter.exe download link, please try again.`);
			ux.exit(0);
		}

		const writeStream = fs.createWriteStream(path.resolve(__dirname, '../../.deps/YTSubConverter.exe'));
		const response = await axios.get(asset!.browser_download_url, { responseType: 'stream' })
			.catch((error) => {
				debug(error);
				ux.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
				ux.exit(1);
			});

		response.data.pipe(writeStream)
			.on('error', (error: never) => {
				debug(error);
				ux.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
				ux.exit(1);
			});

		ux.action.stop();
	}

	debug('YTSubConverter was found!');
	return `wine ${path.resolve(__dirname, '../../.deps/YTSubConverter.exe')}`;
}
