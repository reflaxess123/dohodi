#!/usr/bin/env node
/**
 * PreToolUse Guardrails Hook
 *
 * Блокирует опасные паттерны ПЕРЕД записью файлов:
 * - Hardcoded credentials
 * - TypeScript `any` types
 * - Python wildcard imports
 * - Bare except/pass statements
 * - FSD layer violations
 * - Protected files modification
 *
 * Exit codes:
 * - 0: Allow (с optional JSON output)
 * - 2: Block (stderr показывается как причина блокировки)
 */

import { readFileSync } from 'fs';

interface PreToolInput {
    hook_event_name: string;
    tool_name: string;
    tool_input: {
        file_path?: string;
        file_contents?: string;
        content?: string;
        command?: string;
        old_string?: string;
        new_string?: string;
    };
    tool_use_id: string;
    session_id: string;
    cwd: string;
}

interface GuardrailViolation {
    rule: string;
    severity: 'BLOCK' | 'WARN';
    message: string;
    suggestion?: string;
}

// =============================================================================
// GUARDRAIL RULES CONFIGURATION
// =============================================================================

const PROTECTED_FILES = [
    '.env',
    '.env.production',
    '.env.local',
    'docker-compose.yml',
    'docker-compose.prod.yml',
    'Dockerfile',
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    'poetry.lock',
];

const PROTECTED_PATHS = [
    /\.git\//,
    /node_modules\//,
    /__pycache__\//,
    /\.venv\//,
];

// Pattern rule interface
interface PatternRule {
    pattern: RegExp;
    message: string;
    suggestion: string;
    filePattern?: RegExp;
    pathExclusion?: RegExp;
}

// Patterns that should BLOCK file writes
const BLOCKING_PATTERNS: Record<string, PatternRule> = {
    // Security: Hardcoded credentials
    hardcodedSecrets: {
        pattern: /(password|secret|api_key|apikey|token|private_key|access_token|refresh_token)\s*[=:]\s*["'][^"']{8,}["']/gi,
        message: 'Hardcoded credentials detected',
        suggestion: 'Use environment variables instead: os.getenv("VAR") or process.env.VAR',
    },

    // TypeScript: No `any` type
    typescriptAny: {
        pattern: /:\s*any\b|as\s+any\b|<any>/g,
        filePattern: /\.(ts|tsx)$/,
        message: 'TypeScript `any` type is prohibited',
        suggestion: 'Use `unknown` with type guards, or define proper types',
    },

    // Python: No wildcard imports
    pythonWildcardImport: {
        pattern: /from\s+\S+\s+import\s+\*/g,
        filePattern: /\.py$/,
        message: 'Wildcard imports are prohibited',
        suggestion: 'Import specific names: from module import name1, name2',
    },

    // Python: No bare except
    pythonBareExcept: {
        pattern: /except\s*:/g,
        filePattern: /\.py$/,
        message: 'Bare except clause is prohibited',
        suggestion: 'Use specific exception: except ValueError: or except Exception as e:',
    },

    // Python: No pass in except (swallowing errors)
    pythonPassInExcept: {
        pattern: /except[^:]*:\s*\n\s*pass\b/g,
        filePattern: /\.py$/,
        message: 'Swallowing exceptions with pass is prohibited',
        suggestion: 'At minimum, log the error: logger.error("Error", exc_info=True)',
    },

    // No console.log in production code (frontend)
    consoleLogInProd: {
        pattern: /console\.(log|debug|info)\(/g,
        filePattern: /front\/src\/(pages|widgets|features|entities)\/.*\.(ts|tsx)$/,
        pathExclusion: /\.(test|spec)\./,
        message: 'console.log in production code',
        suggestion: 'Remove debug logs or use proper logging service',
    },

    // No test imports in production code
    testImportsInProd: {
        pattern: /import.*from\s+['"](@testing-library|jest|vitest|pytest|unittest\.mock)['"]/g,
        pathExclusion: /\.(test|spec)\.|__tests__|tests\//,
        message: 'Test library imports in production code',
        suggestion: 'Move test code to test files',
    },
};

// Patterns that should WARN but not block
const WARNING_PATTERNS: Record<string, PatternRule> = {
    // TypeScript: Prefer unknown over explicit any cast
    explicitAnyCast: {
        pattern: /as\s+unknown\s+as\s+\w+/g,
        filePattern: /\.(ts|tsx)$/,
        message: 'Double type assertion detected (as unknown as X)',
        suggestion: 'Consider using type guards or proper typing',
    },

    // Large functions (rough heuristic)
    todoFixme: {
        pattern: /\/\/\s*(TODO|FIXME|HACK|XXX):/gi,
        message: 'TODO/FIXME comment found',
        suggestion: 'Consider addressing before committing',
    },
};

// FSD rule interface
interface FSDRule {
    filePath: RegExp;
    pattern: RegExp;
    message: string;
    suggestion: string;
}

// FSD Architecture Rules (Frontend specific)
const FSD_RULES: Record<string, FSDRule> = {
    // Pages cannot import from widgets directly (should use features)
    pagesImportWidgets: {
        filePath: /front\/src\/pages\//,
        pattern: /import.*from\s+['"]widgets\//,
        message: 'FSD Violation: pages should not import directly from widgets',
        suggestion: 'Use features layer as intermediary, or import from shared',
    },

    // Features cannot import from widgets
    featuresImportWidgets: {
        filePath: /front\/src\/features\//,
        pattern: /import.*from\s+['"]widgets\//,
        message: 'FSD Violation: features cannot import from widgets (higher layer)',
        suggestion: 'Move shared code to entities or shared layers',
    },

    // Entities cannot import from features
    entitiesImportFeatures: {
        filePath: /front\/src\/entities\//,
        pattern: /import.*from\s+['"]features\//,
        message: 'FSD Violation: entities cannot import from features (higher layer)',
        suggestion: 'Entities should only import from shared layer',
    },

    // Shared cannot import from any app layer
    sharedImportApp: {
        filePath: /front\/src\/shared\//,
        pattern: /import.*from\s+['"](pages|widgets|features|entities)\//,
        message: 'FSD Violation: shared cannot import from application layers',
        suggestion: 'Shared layer must be self-contained',
    },
};

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

function checkProtectedFiles(filePath: string): GuardrailViolation | null {
    const fileName = filePath.split(/[/\\]/).pop() || '';

    // Check exact file names
    if (PROTECTED_FILES.includes(fileName)) {
        return {
            rule: 'protected-file',
            severity: 'BLOCK',
            message: `Protected file: ${fileName} cannot be modified`,
            suggestion: 'This file requires manual editing or explicit user approval',
        };
    }

    // Check path patterns
    for (const pattern of PROTECTED_PATHS) {
        if (pattern.test(filePath)) {
            return {
                rule: 'protected-path',
                severity: 'BLOCK',
                message: `Protected path: ${filePath}`,
                suggestion: 'This directory should not be modified by Claude',
            };
        }
    }

    return null;
}

function checkBlockingPatterns(filePath: string, content: string): GuardrailViolation[] {
    const violations: GuardrailViolation[] = [];

    for (const [ruleName, rule] of Object.entries(BLOCKING_PATTERNS)) {
        // Check file pattern match
        if (rule.filePattern && !rule.filePattern.test(filePath)) {
            continue;
        }

        // Check path exclusion
        if (rule.pathExclusion && rule.pathExclusion.test(filePath)) {
            continue;
        }

        // Check content pattern
        const matches = content.match(rule.pattern);
        if (matches && matches.length > 0) {
            violations.push({
                rule: ruleName,
                severity: 'BLOCK',
                message: `${rule.message} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`,
                suggestion: rule.suggestion,
            });
        }
    }

    return violations;
}

function checkFSDRules(filePath: string, content: string): GuardrailViolation[] {
    const violations: GuardrailViolation[] = [];

    for (const [ruleName, rule] of Object.entries(FSD_RULES)) {
        // Check if file matches the rule's path pattern
        if (!rule.filePath.test(filePath)) {
            continue;
        }

        // Check import pattern
        const matches = content.match(rule.pattern);
        if (matches && matches.length > 0) {
            violations.push({
                rule: `fsd-${ruleName}`,
                severity: 'BLOCK',
                message: rule.message,
                suggestion: rule.suggestion,
            });
        }
    }

    return violations;
}

function checkWarningPatterns(filePath: string, content: string): GuardrailViolation[] {
    const violations: GuardrailViolation[] = [];

    for (const [ruleName, rule] of Object.entries(WARNING_PATTERNS)) {
        if (rule.filePattern && !rule.filePattern.test(filePath)) {
            continue;
        }

        const matches = content.match(rule.pattern);
        if (matches && matches.length > 0) {
            violations.push({
                rule: ruleName,
                severity: 'WARN',
                message: rule.message,
                suggestion: rule.suggestion,
            });
        }
    }

    return violations;
}

function validateContent(filePath: string, content: string): {
    blocked: boolean;
    violations: GuardrailViolation[];
} {
    const violations: GuardrailViolation[] = [];

    // 1. Check protected files
    const protectedViolation = checkProtectedFiles(filePath);
    if (protectedViolation) {
        violations.push(protectedViolation);
    }

    // 2. Check blocking patterns
    violations.push(...checkBlockingPatterns(filePath, content));

    // 3. Check FSD rules (frontend only)
    if (filePath.includes('front/src/')) {
        violations.push(...checkFSDRules(filePath, content));
    }

    // 4. Check warning patterns
    violations.push(...checkWarningPatterns(filePath, content));

    const blocked = violations.some(v => v.severity === 'BLOCK');

    return { blocked, violations };
}

// =============================================================================
// MAIN HOOK LOGIC
// =============================================================================

async function main() {
    try {
        const input = readFileSync(0, 'utf-8');
        const data: PreToolInput = JSON.parse(input);

        const toolName = data.tool_name;
        const toolInput = data.tool_input;

        // Only validate Write/Edit operations
        if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) {
            process.exit(0);
        }

        const filePath = toolInput.file_path || '';

        // Skip non-code files
        if (filePath.endsWith('.md') || filePath.endsWith('.txt') || filePath.endsWith('.json')) {
            // Still check JSON files for secrets
            if (filePath.endsWith('.json')) {
                const content = toolInput.content || toolInput.file_contents || toolInput.new_string || '';
                const secretMatch = content.match(BLOCKING_PATTERNS.hardcodedSecrets.pattern);
                if (secretMatch) {
                    console.error(`
🚫 GUARDRAIL BLOCK: Hardcoded credentials in JSON file

File: ${filePath}
Issue: Potential secrets detected in JSON content

Suggestion: Use environment variable references or separate secrets file
`);
                    process.exit(2);
                }
            }
            process.exit(0);
        }

        // Get content to validate
        let content = '';
        if (toolName === 'Write') {
            content = toolInput.content || toolInput.file_contents || '';
        } else if (toolName === 'Edit' || toolName === 'MultiEdit') {
            content = toolInput.new_string || '';
        }

        if (!content) {
            process.exit(0);
        }

        // Validate content
        const { blocked, violations } = validateContent(filePath, content);

        if (violations.length === 0) {
            process.exit(0);
        }

        // Format output
        const blockingViolations = violations.filter(v => v.severity === 'BLOCK');
        const warningViolations = violations.filter(v => v.severity === 'WARN');

        if (blocked) {
            // Output to stderr for blocking (exit code 2)
            let errorMsg = `
🚫 GUARDRAIL BLOCK: Code quality violations detected

File: ${filePath}

`;
            for (const v of blockingViolations) {
                errorMsg += `❌ [${v.rule}] ${v.message}\n`;
                if (v.suggestion) {
                    errorMsg += `   💡 ${v.suggestion}\n`;
                }
                errorMsg += '\n';
            }

            if (warningViolations.length > 0) {
                errorMsg += `\n⚠️  Additional warnings:\n`;
                for (const v of warningViolations) {
                    errorMsg += `   • ${v.message}\n`;
                }
            }

            errorMsg += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fix these issues before writing the file.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

            console.error(errorMsg);
            process.exit(2);
        } else {
            // Only warnings - allow but show message
            const output = {
                hookSpecificOutput: {
                    hookEventName: 'PreToolUse',
                    permissionDecision: 'allow',
                    systemMessage: `⚠️ Warnings for ${filePath}: ${warningViolations.map(v => v.message).join(', ')}`,
                },
            };
            console.log(JSON.stringify(output));
            process.exit(0);
        }

    } catch (err) {
        // On error, allow operation (fail open)
        if (err instanceof Error) {
            console.error(`PreToolUse hook error: ${err.message}`);
        }
        process.exit(0);
    }
}

main();
