import { readFileSync } from 'fs';
import { join } from 'path';

const projectDir = process.cwd().replace(/\\.claude.*$/, '');
const rulesPath = join(projectDir, '.claude', 'skills', 'skill-rules.json');
const rules = JSON.parse(readFileSync(rulesPath, 'utf-8'));

console.log('🧪 Testing Skill Activation System\n');
console.log('═'.repeat(60) + '\n');

const testPrompts = [
    { text: "Создай новый роутер для управления комментариями", expected: "fastapi-backend-guidelines" },
    { text: "Добавь компонент карточки продукта в features", expected: "react-frontend-guidelines" },
    { text: "Create a new API endpoint for user profiles", expected: "fastapi-backend-guidelines" },
    { text: "Build a widget for displaying progress charts", expected: "react-frontend-guidelines" },
    { text: "Нужен новый сервис для обработки платежей", expected: "fastapi-backend-guidelines" },
];

testPrompts.forEach((test, idx) => {
    console.log(`Test ${idx + 1}: "${test.text}"`);
    const prompt = test.text.toLowerCase();
    const matches = [];

    for (const [skillName, config] of Object.entries(rules.skills)) {
        const triggers = config.promptTriggers;
        if (!triggers) continue;

        // Check keywords
        if (triggers.keywords?.some(kw => prompt.includes(kw.toLowerCase()))) {
            matches.push({ name: skillName, type: 'keyword', priority: config.priority });
        }

        // Check intent patterns
        if (triggers.intentPatterns?.some(pattern => new RegExp(pattern, 'i').test(prompt))) {
            if (!matches.find(m => m.name === skillName)) {
                matches.push({ name: skillName, type: 'intent', priority: config.priority });
            }
        }
    }

    if (matches.length > 0) {
        console.log(`  ✅ Matched skills:`);
        matches.forEach(m => console.log(`     → ${m.name} (${m.type}, ${m.priority})`));
        const hasExpected = matches.some(m => m.name === test.expected);
        console.log(`  Expected: ${test.expected} - ${hasExpected ? '✓ PASS' : '✗ FAIL'}`);
    } else {
        console.log(`  ✗ No matches - FAIL`);
    }
    console.log();
});

console.log('═'.repeat(60));
console.log('\n📋 Available Skills:');
Object.entries(rules.skills).forEach(([name, config]) => {
    const keywords = config.promptTriggers?.keywords?.slice(0, 5).join(', ') || 'none';
    console.log(`  • ${name} (${config.priority})`);
    console.log(`    Keywords: ${keywords}...`);
});
