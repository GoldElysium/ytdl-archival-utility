import * as fs from 'node:fs';
import got from 'got';
import * as path from 'node:path';
import commandExists from 'command-exists';
import { CliUx } from '@oclif/core';
import * as chalk from 'chalk';
import Debug from 'debug';

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
			name: string;
			browser_download_url: string;
		}[];
	};

	let wineExists = false;
	await commandExists('wine').then(() => { wineExists = true; }).catch(() => { wineExists = false; });

	if (platform === 'win32') {
		if (!fs.existsSync(path.resolve(__dirname, '../../.deps/YTSubConverter.exe'))) {
			debug('Failed to find YTSubConverter.exe');
			CliUx.ux.exit(0);
			CliUx.ux.action.start('Downloading YTSubConverter.exe', 'downloading', { stdout: true });

			const githubApiResponse: GithubApiResponse = await got('https://api.github.com/repos/arcusmaximus/YTSubConverter/releases/latest')
				.json();
			debug(githubApiResponse);
			const asset = githubApiResponse.assets.find((item) => item.name.endsWith('.exe'));
			debug(asset);
			if (!asset) {
				CliUx.ux.log(`${chalk.red.bold('ERROR:')} Could not find YTSubConverter.exe download link, please try again.`);
				CliUx.ux.exit(0);
			}

			const writeStream = fs.createWriteStream(path.resolve(__dirname, '../../.deps/YTSubConverter.exe'));
			const stream = got.stream(asset!.browser_download_url)
				.on('error', (error) => {
					debug(error);
					CliUx.ux.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
					CliUx.ux.exit(1);
				});

			stream.pipe(writeStream)
				.on('error', (error) => {
					debug(error);
					CliUx.ux.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
					CliUx.ux.exit(1);
				});

			CliUx.ux.action.stop();
		}

		debug('YTSubConverter was found!');
		return `${path.resolve(__dirname, '../../.deps/YTSubConverter.exe')}`;
	}
	if (platform === 'darwin') {
		// TODO: Check if YTSubConverter.app is in the deps folder

		if (wineExists) {
			if (!fs.existsSync(path.resolve(__dirname, '../../.deps/YTSubConverter.exe'))) {
				CliUx.ux.action.start('Downloading YTSubConverter.exe', 'downloading', { stdout: true });

				const githubApiResponse: GithubApiResponse = await got('https://api.github.com/repos/arcusmaximus/YTSubConverter/releases/latest')
					.json();
				debug(githubApiResponse);
				const asset = githubApiResponse.assets.find((item) => item.name.endsWith('.exe'));
				debug(asset);
				if (!asset) {
					CliUx.ux.log(`${chalk.red.bold('ERROR:')} Could not find YTSubConverter.exe download link, please try again.`);
					CliUx.ux.exit(0);
				}

				const writeStream = fs.createWriteStream(path.resolve(__dirname, '../../.deps/YTSubConverter.exe'));
				const stream = got.stream(asset!.browser_download_url)
					.on('error', (error) => {
						debug(error);
						CliUx.ux.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
						CliUx.ux.exit(1);
					});

				stream.pipe(writeStream)
					.on('error', (error) => {
						debug(error);
						CliUx.ux.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
						CliUx.ux.exit(1);
					});

				CliUx.ux.action.stop();
			}

			debug('YTSubConverter was found!');
			return `wine ${path.resolve(__dirname, '../../.deps/YTSubConverter.exe')}`;
		}

		const { body: githubApiResponse }: { body: GithubApiResponse } = await got('https://api.github.com/repos/arcusmaximus/YTSubConverter/releases/latest').json();
		// ! TODO: Remove directive below
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const macOsUrl = githubApiResponse.assets.find((item) => item.name.endsWith('.dmg'));
		// TODO: Mount DMG and copy folder to .deps
		return '';
	}

	if (!wineExists) {
		CliUx.ux.log(`${chalk.red.bold('ERROR:')} Wine was not found, please install it first`);
		CliUx.ux.exit(0);
	}

	if (!fs.existsSync(path.resolve(__dirname, '../../.deps/YTSubConverter.exe'))) {
		CliUx.ux.action.start('Downloading YTSubConverter.exe', 'downloading', { stdout: true });

		const githubApiResponse: GithubApiResponse = await got('https://api.github.com/repos/arcusmaximus/YTSubConverter/releases/latest').json();
		debug(githubApiResponse);
		const asset = githubApiResponse.assets.find((item) => item.name.endsWith('.exe'));
		debug(asset);
		if (!asset) {
			CliUx.ux.log(`${chalk.red.bold('ERROR:')} Could not find YTSubConverter.exe download link, please try again.`);
			CliUx.ux.exit(0);
		}

		const writeStream = fs.createWriteStream(path.resolve(__dirname, '../../.deps/YTSubConverter.exe'));
		const stream = got.stream(asset!.browser_download_url)
			.on('error', (error) => {
				debug(error);
				CliUx.ux.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
				CliUx.ux.exit(1);
			});

		stream.pipe(writeStream)
			.on('error', (error) => {
				debug(error);
				CliUx.ux.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
				CliUx.ux.exit(1);
			});

		CliUx.ux.action.stop();
	}

	debug('YTSubConverter was found!');
	return `wine ${path.resolve(__dirname, '../../.deps/YTSubConverter.exe')}`;
}
