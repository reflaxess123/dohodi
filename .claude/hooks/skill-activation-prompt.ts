#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    permission_mode: string;
    prompt: string;
}

interface PromptTriggers {
    keywords?: string[];
    intentPatterns?: string[];
}

interface FileTriggers {
    pathPatterns?: string[];
    pathExclusions?: string[];
    contentPatterns?: string[];
}

interface SkillRule {
    type: 'guardrail' | 'domain';
    enforcement: 'block' | 'suggest' | 'warn';
    priority: 'critical' | 'high' | 'medium' | 'low';
    description?: string;
    promptTriggers?: PromptTriggers;
    fileTriggers?: FileTriggers;
}

interface SkillRules {
    version: string;
    skills: Record<string, SkillRule>;
}

interface MatchedSkill {
    name: string;
    matchType: 'keyword' | 'intent' | 'file_path' | 'file_content';
    matchDetails?: string;
    config: SkillRule;
}

// Извлекаем упоминания файлов из промпта
function extractFilePathsFromPrompt(prompt: string): string[] {
    const paths: string[] = [];

    // Паттерны для путей файлов
    const patterns = [
        // @file_path или @folder/file
        /@([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)/g,
        // front/src/... или back/app/...
        /\b(front\/src\/[a-zA-Z0-9_\-./]+\.[a-zA-Z]+)/g,
        /\b(back\/app\/[a-zA-Z0-9_\-./]+\.[a-zA-Z]+)/g,
        // Любой путь с расширением .py, .tsx, .ts, .scss
        /\b([a-zA-Z0-9_\-./\\]+\.(py|tsx?|scss|json))\b/g,
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(prompt)) !== null) {
            paths.push(match[1]);
        }
    }

    return [...new Set(paths)]; // Уникальные пути
}

// Проверяем, соответствует ли путь файла паттернам
function matchesPathPattern(filePath: string, patterns: string[]): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');

    for (const pattern of patterns) {
        // Простой glob-подобный matching
        const regexPattern = pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\//g, '\\/');

        const regex = new RegExp(regexPattern);
        if (regex.test(normalizedPath)) {
            return true;
        }
    }

    return false;
}

// Проверяем содержимое файла на паттерны
function checkFileContent(projectDir: string, filePath: string, contentPatterns: string[]): boolean {
    try {
        const fullPath = filePath.startsWith('/') || filePath.includes(':')
            ? filePath
            : join(projectDir, filePath);

        if (!existsSync(fullPath)) {
            return false;
        }

        const content = readFileSync(fullPath, 'utf-8');

        for (const pattern of contentPatterns) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(content)) {
                return true;
            }
        }
    } catch {
        // Игнорируем ошибки чтения файлов
    }

    return false;
}

// Получаем недавно изменённые файлы из кэша
function getRecentlyEditedFiles(projectDir: string, sessionId: string): string[] {
    const cacheDir = join(projectDir, '.claude', 'tsc-cache', sessionId || 'default');
    const logPath = join(cacheDir, 'edited-files.log');

    if (!existsSync(logPath)) {
        return [];
    }

    try {
        const content = readFileSync(logPath, 'utf-8');
        const lines = content.trim().split('\n');
        const now = Date.now() / 1000;
        const fiveMinAgo = now - 300;

        const recentFiles: string[] = [];

        for (const line of lines) {
            const [timestamp, filepath] = line.split(':');
            if (Number(timestamp) >= fiveMinAgo) {
                recentFiles.push(filepath);
            }
        }

        return [...new Set(recentFiles)];
    } catch {
        return [];
    }
}

async function main() {
    try {
        // Read input from stdin
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);
        const prompt = data.prompt.toLowerCase();
        const originalPrompt = data.prompt;

        // Load skill rules
        const projectDir = data.cwd || process.env.CLAUDE_PROJECT_DIR || resolve(__dirname, '..', '..');
        const rulesPath = join(projectDir, '.claude', 'skills', 'skill-rules.json');

        let rules: SkillRules;
        try {
            rules = JSON.parse(readFileSync(rulesPath, 'utf-8'));
        } catch (fileErr) {
            console.error(`Failed to read rules from: ${rulesPath}`);
            process.exit(1);
        }

        const matchedSkills: MatchedSkill[] = [];

        // Извлекаем файлы из промпта
        const mentionedFiles = extractFilePathsFromPrompt(originalPrompt);

        // Получаем недавно изменённые файлы
        const recentFiles = getRecentlyEditedFiles(projectDir, data.session_id);

        // Все релевантные файлы
        const allRelevantFiles = [...new Set([...mentionedFiles, ...recentFiles])];

        // Check each skill for matches
        for (const [skillName, config] of Object.entries(rules.skills)) {
            let matched = false;

            // 1. Prompt-based triggers (keywords)
            const promptTriggers = config.promptTriggers;
            if (promptTriggers && !matched) {
                // Keyword matching
                if (promptTriggers.keywords) {
                    const keywordMatch = promptTriggers.keywords.find(kw =>
                        prompt.includes(kw.toLowerCase())
                    );
                    if (keywordMatch) {
                        matchedSkills.push({
                            name: skillName,
                            matchType: 'keyword',
                            matchDetails: `keyword: "${keywordMatch}"`,
                            config
                        });
                        matched = true;
                    }
                }

                // Intent pattern matching
                if (!matched && promptTriggers.intentPatterns) {
                    for (const pattern of promptTriggers.intentPatterns) {
                        const regex = new RegExp(pattern, 'i');
                        if (regex.test(prompt)) {
                            matchedSkills.push({
                                name: skillName,
                                matchType: 'intent',
                                matchDetails: `pattern: "${pattern}"`,
                                config
                            });
                            matched = true;
                            break;
                        }
                    }
                }
            }

            // 2. File-based triggers
            const fileTriggers = config.fileTriggers;
            if (fileTriggers && !matched && allRelevantFiles.length > 0) {
                // Path pattern matching
                if (fileTriggers.pathPatterns) {
                    for (const file of allRelevantFiles) {
                        // Check exclusions first
                        if (fileTriggers.pathExclusions &&
                            matchesPathPattern(file, fileTriggers.pathExclusions)) {
                            continue;
                        }

                        if (matchesPathPattern(file, fileTriggers.pathPatterns)) {
                            matchedSkills.push({
                                name: skillName,
                                matchType: 'file_path',
                                matchDetails: `file: "${file}"`,
                                config
                            });
                            matched = true;
                            break;
                        }
                    }
                }

                // Content pattern matching
                if (!matched && fileTriggers.contentPatterns) {
                    for (const file of allRelevantFiles) {
                        if (checkFileContent(projectDir, file, fileTriggers.contentPatterns)) {
                            matchedSkills.push({
                                name: skillName,
                                matchType: 'file_content',
                                matchDetails: `content in: "${file}"`,
                                config
                            });
                            matched = true;
                            break;
                        }
                    }
                }
            }
        }

        // Generate output if matches found
        if (matchedSkills.length > 0) {
            // Sort by priority: critical > high > medium > low
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const sortedSkills = matchedSkills.sort((a, b) =>
                priorityOrder[a.config.priority] - priorityOrder[b.config.priority]
            );

            // Build evaluation prompt
            let evalPrompt = `
=== MANDATORY SKILL EVALUATION PROTOCOL ===

Detected ${matchedSkills.length} potentially relevant skill(s) based on your request.

You MUST complete these steps IN ORDER before ANY implementation:

STEP 1 - EVALUATE each skill below (write YES or NO with brief reason):
`;
            sortedSkills.forEach(s => {
                const priorityLabel = s.config.priority === 'critical' ? '[CRITICAL]' :
                                     s.config.priority === 'high' ? '[HIGH]' :
                                     s.config.priority === 'medium' ? '[MEDIUM]' : '[LOW]';
                const desc = s.config.description ? ` - ${s.config.description}` : '';
                const match = s.matchDetails ? ` (matched: ${s.matchDetails})` : '';
                evalPrompt += `  • ${s.name} ${priorityLabel}${desc}${match}\n`;
                evalPrompt += `    → YES/NO - reason\n`;
            });

            evalPrompt += `
STEP 2 - ACTIVATE skills (for each YES above):
  Call: Skill("skill-name") - IMMEDIATELY, one by one

STEP 3 - Only AFTER loading skills, proceed with implementation

⚠️  CRITICAL: Evaluation without activation is WORTHLESS!
    DO NOT skip to implementation. DO NOT write code before Step 2.
============================================
`;

            // Output as JSON with additionalContext
            const jsonOutput = {
                hookSpecificOutput: {
                    hookEventName: "UserPromptSubmit",
                    additionalContext: evalPrompt
                }
            };

            console.log(JSON.stringify(jsonOutput));
        }
        // Если skills не найдены - молча выходим без ошибок

        process.exit(0);
    } catch (err) {
        if (err instanceof Error) {
            console.error('Error in skill-activation-prompt hook:', err.message);
        } else {
            console.error('Error in skill-activation-prompt hook:', err);
        }
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Uncaught error:', err);
    process.exit(1);
});
