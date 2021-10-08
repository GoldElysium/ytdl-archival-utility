// eslint-disable-next-line node/no-missing-import
import * as fs from 'node:fs';
import got from 'got';
// eslint-disable-next-line node/no-missing-import
import * as path from 'node:path';
import * as commandExists from 'command-exists';
import cli from 'cli-ux';
import * as chalk from 'chalk';
import * as Debug from 'debug';

const debug = Debug('vdownloader');

const { platform } = process;

// eslint-disable-next-line import/prefer-default-export
export async function firstInit(): Promise<void> {
	if (!fs.existsSync(path.resolve(__dirname, '../.deps'))) {
		fs.mkdirSync(path.resolve(__dirname, '../.deps'));
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

	if (platform === 'win32' && !fs.existsSync(path.resolve(__dirname, '../.deps/YTSubConverter.exe'))) {
		cli.action.start('Downloading YTSubConverter.exe', 'downloading', { stdout: true });

		const githubApiResponse: GithubApiResponse = await got('https://api.github.com/repos/arcusmaximus/YTSubConverter/releases/latest').json();
		debug(githubApiResponse);
		const asset = githubApiResponse.assets.find((item) => item.name.endsWith('.exe'));
		debug(asset);
		if (!asset) {
			cli.log(`${chalk.red.bold('ERROR:')} Could not find YTSubConverter.exe download link, please try again.`);
			cli.exit(0);
		}

		const writeStream = fs.createWriteStream(path.resolve(__dirname, '../.deps/YTSubConverter.exe'));
		const stream = got.stream(asset!.browser_download_url)
			.on('error', (error) => {
				debug(error);
				cli.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
				cli.exit(1);
			});

		stream.pipe(writeStream)
			.on('error', (error) => {
				debug(error);
				cli.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
				cli.exit(1);
			});

		cli.action.stop();
	} else if (platform === 'darwin') {
		await commandExists('YTSubConverter').catch(async () => {
			if (wineExists && !fs.existsSync(path.resolve(__dirname, '../.deps/YTSubConverter.exe'))) {
				cli.action.start('Downloading YTSubConverter.exe', 'downloading', { stdout: true });

				const githubApiResponse: GithubApiResponse = await got('https://api.github.com/repos/arcusmaximus/YTSubConverter/releases/latest').json();
				debug(githubApiResponse);
				const asset = githubApiResponse.assets.find((item) => item.name.endsWith('.exe'));
				debug(asset);
				if (!asset) {
					cli.log(`${chalk.red.bold('ERROR:')} Could not find YTSubConverter.exe download link, please try again.`);
					cli.exit(0);
				}

				const writeStream = fs.createWriteStream(path.resolve(__dirname, '../.deps/YTSubConverter.exe'));
				const stream = got.stream(asset!.browser_download_url)
					.on('error', (error) => {
						debug(error);
						cli.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
						cli.exit(1);
					});

				stream.pipe(writeStream)
					.on('error', (error) => {
						debug(error);
						cli.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
						cli.exit(1);
					});

				cli.action.stop();
			} else {
				const { body: githubApiResponse }: { body: GithubApiResponse } = await got('https://api.github.com/repos/arcusmaximus/YTSubConverter/releases/latest').json();
				const macOsUrl = githubApiResponse.assets.find((item) => item.name.endsWith('.dmg'));
				// TODO: Mount DMG and copy folder to .deps
			}
		});
	} else {
		if (!wineExists) {
			cli.log(`${chalk.red.bold('ERROR:')} Wine was not found, please install it first`);
			cli.exit(0);
		}

		if (!fs.existsSync(path.resolve(__dirname, '../.deps/YTSubConverter.exe'))) {
			cli.action.start('Downloading YTSubConverter.exe', 'downloading', { stdout: true });

			const githubApiResponse: GithubApiResponse = await got('https://api.github.com/repos/arcusmaximus/YTSubConverter/releases/latest').json();
			debug(githubApiResponse);
			const asset = githubApiResponse.assets.find((item) => item.name.endsWith('.exe'));
			debug(asset);
			if (!asset) {
				cli.log(`${chalk.red.bold('ERROR:')} Could not find YTSubConverter.exe download link, please try again.`);
				cli.exit(0);
			}

			const writeStream = fs.createWriteStream(path.resolve(__dirname, '../.deps/YTSubConverter.exe'));
			const stream = got.stream(asset!.browser_download_url)
				.on('error', (error) => {
					debug(error);
					cli.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
					cli.exit(1);
				});

			stream.pipe(writeStream)
				.on('error', (error) => {
					debug(error);
					cli.log(`${chalk.red.bold('ERROR:')} Failed to download YTSubConverter.`);
					cli.exit(1);
				});

			cli.action.stop();
		}

		debug('YTSubConverter was found!');
	}
}
