import "dotenv/config";
import readline from "readline";
import { CONFIG } from "./config.js";
import { runAgent } from "./agent.js";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const chatHistory = [
    { role: "system", content: CONFIG.SYSTEM_PROMPT }
];

function ask() {
    rl.question("You: ", async (input) => {
        const trimmedInput = input.trim();
        if (!trimmedInput) {
            ask();
            return;
        }

        if (trimmedInput.toLowerCase() === "exit") {
            rl.close();
            process.exit(0);
            return;
        }

        try {
            await runAgent(trimmedInput, chatHistory, true);
        } catch (err) {
            console.error("Error in interactive loop:", err.message);
        }
        ask();
    });
}

async function main() {
    console.log("Mistral Autonomous Tool Assistant started. Type 'exit' to quit.");
    ask();
}

// Check for command line arguments or run default test
if (process.argv[2]) {
    runAgent(process.argv.slice(2).join(" "), chatHistory, false).then(() => process.exit(0));
} else {
    main();
}