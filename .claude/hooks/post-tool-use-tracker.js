#!/usr/bin/env node
/**
 * Post-tool-use hook that tracks edited files and their repos
 * This runs after Edit, MultiEdit, or Write tools complete successfully
 */

import { readFileSync, existsSync, mkdirSync, appendFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function detectRepo(filePath, projectRoot) {
    // Remove project root from path
    let relativePath = filePath.replace(projectRoot, '').replace(/^[/\\]/, '');
    relativePath = relativePath.replace(/\\/g, '/');

    // Extract first directory component
    const repo = relativePath.split('/')[0];

    // Common project directory patterns
    switch (repo) {
        case 'front':
        case 'frontend':
        case 'client':
        case 'web':
        case 'ui':
            return 'front';
        case 'back':
        case 'backend':
        case 'server':
        case 'api':
        case 'services':
            return 'back';
        case 'database':
        case 'prisma':
        case 'migrations':
            return repo;
        case 'packages':
        case 'examples':
            const subdir = relativePath.split('/')[1];
            return subdir ? `${repo}/${subdir}` : repo;
        default:
            if (!relativePath.includes('/')) {
                return 'root';
            }
            return 'unknown';
    }
}

async function main() {
    try {
        const input = readFileSync(0, 'utf-8');
        const data = JSON.parse(input);

        const toolName = data.tool_name;
        const filePath = data.tool_input?.file_path || '';
        const sessionId = data.session_id || 'default';

        // Skip if not an edit tool or no file path
        if (!['Edit', 'MultiEdit', 'Write'].includes(toolName) || !filePath) {
            process.exit(0);
        }

        // Skip markdown files
        if (filePath.endsWith('.md') || filePath.endsWith('.markdown')) {
            process.exit(0);
        }

        const projectDir = data.cwd || process.env.CLAUDE_PROJECT_DIR || join(__dirname, '..', '..');
        const cacheDir = join(projectDir, '.claude', 'tsc-cache', sessionId);

        // Ensure cache directory exists
        if (!existsSync(cacheDir)) {
            mkdirSync(cacheDir, { recursive: true });
        }

        // Detect repo
        const repo = detectRepo(filePath, projectDir);

        // Skip if unknown repo
        if (repo === 'unknown' || !repo) {
            process.exit(0);
        }

        // Log edited file
        const timestamp = Math.floor(Date.now() / 1000);
        appendFileSync(join(cacheDir, 'edited-files.log'), `${timestamp}:${filePath}:${repo}\n`);

        // Update affected repos list
        const affectedReposFile = join(cacheDir, 'affected-repos.txt');
        let existingRepos = '';
        if (existsSync(affectedReposFile)) {
            existingRepos = readFileSync(affectedReposFile, 'utf-8');
        }
        if (!existingRepos.split('\n').includes(repo)) {
            appendFileSync(affectedReposFile, `${repo}\n`);
        }

        process.exit(0);
    } catch (err) {
        // Fail silently - hooks should not block on errors
        process.exit(0);
    }
}

main();
