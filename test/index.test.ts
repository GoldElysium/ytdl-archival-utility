import { expect, test } from '@oclif/test';

import cmd = require('../src');

// TODO: Write tests
describe('ytdl-archival-utility', () => {
	test
		.stdout()
		.do(() => cmd.run([]))
		.it('runs hello', (ctx) => {
			expect(ctx.stdout).to.contain('hello world');
		});

	test
		.stdout()
		.do(() => cmd.run(['--name', 'jeff']))
		.it('runs hello --name jeff', (ctx) => {
			expect(ctx.stdout).to.contain('hello jeff');
		});
});
