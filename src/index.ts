'use strict'

import * as core from '@actions/core';
import { exec } from '@actions/exec';
import * as tc from '@actions/tool-cache';
import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const semver = require('semver');
const github = new Octokit();

if (require.main === module) {
    main().catch(err => {
        console.error(err.stack);
        process.exit(1);
    });
}

async function main(): Promise<void> {
    try {
        const tool = 'aws-cli';
        let version = core.getInput('version').replace(/^v/, '') || 'latest';

        if (version === 'latest') {
            const tags = await github.repos.listTags({
                owner: 'aws',
                repo: tool,
                per_page: 5,
            });

            const matchingTags = tags.data
                .map(tag => tag.name)
                .filter(tag => semver.satisfies(tag, '^v2'))

            if (matchingTags.length === 0) {
                throw new Error('Failed to resolve latest version');
            }

            version = matchingTags.sort(semver.rcompare)[0];

            core.info(`Resolved latest version: ${version}`);
        }

        let cachePath = tc.find(tool, version);

        if (!cachePath) {
            const platform = os.platform();
            if (platform !== 'linux') {
                throw new Error(`Unsupported platform: ${platform}`);
            }
            const arch = os.arch();
            let zipArch: string;
            switch (arch) {
                case 'arm64':
                    zipArch = 'aarch64'
                    break;
                case 'x64':
                    zipArch = 'x86_64'
                    break;
                default:
                    throw new Error(`Unsupported architecture: ${arch}`);
            }

            const toolUrl = `https://awscli.amazonaws.com/awscli-exe-linux-${zipArch}-${version}.zip`;

            core.info(`Downloading from ${toolUrl}`);
            const toolArchive = await tc.downloadTool(toolUrl);
            core.info(`Extracting zip archive: ${toolArchive}`);
            const extractPath = await tc.extractZip(toolArchive);

            // The installer creates absolute path symlinks to the the install directory
            // so install where we expect to be called from
            const runnerToolCachePath = process.env.RUNNER_TOOL_CACHE || '';
            if (!runnerToolCachePath) {
                throw new Error('Environment variable RUNNER_TOOL_CACHE not set');
            }
            cachePath = path.join(runnerToolCachePath, tool, version, arch);

            await exec(path.join(extractPath, 'aws/install'), ['--install-dir', cachePath, '--bin-dir', path.join(cachePath, 'bin')]);

            const markerPath = `${cachePath}.complete`;
            fs.writeFileSync(markerPath, '');
        }

        const binDir = path.join(cachePath, 'bin');

        core.addPath(binDir);
        core.setOutput('version', version);
        core.info(`Installed ${tool} version ${version}`);
    } catch (err) {
        core.setFailed(`Action failed with error ${err} `);
    }
}
