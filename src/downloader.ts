import * as ytdl from 'ytdl-core';
import * as Ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from 'ffmpeg-static';
import * as Debug from 'debug';

const debug = Debug('vdownloader');

export interface Answers {
	url: string;
	output: string;
	subtitles: boolean;
	extension: string;
	keep: boolean;
	'disable-backup': boolean;
	'no-subs-embed': boolean;
}

// eslint-disable-next-line import/prefer-default-export
export async function download(answers: Answers): Promise<void> {
	debug(answers);

	Ffmpeg.setFfmpegPath(ffmpegPath);
}
