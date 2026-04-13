import { getIntent } from '../router.js';

const testQueries = [
    "list the venues",
    "show users",
    "get entries from artist",
    "list files in ./venues",
    "What is 5 + 5?",
    "Read sample.txt",
    "How are you today?",
    "Tell me a story about a dragon.",
    "calculate 10!",
    "list files in ./venues"
];

testQueries.forEach(q => {
    console.log(`Query: "${q}" -> Path: ${getIntent(q)?.path}, Tool: ${getIntent(q)?.tool}, Args: ${JSON.stringify(getIntent(q)?.args)}`);
});
