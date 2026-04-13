import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export let allTools = [];
let isToolsLoaded = false;

async function loadDynamicTools() {
    if (isToolsLoaded) return;
    try {
        const files = await fs.readdir(__dirname);
        for (const file of files) {
            if (file.endsWith(".js") && file !== "index.js") {
                const mod = await import(`./${file}`);
                for (const key in mod) {
                    if (Array.isArray(mod[key]) && mod[key].length > 0 && mod[key][0].name) {
                        allTools.push(...mod[key]);
                    }
                    // Isolated Startup Flow for RAG
                    if (file === "rag.js" && key === "loadIndex") {
                         const loaded = await mod.loadIndex();
                         if (!loaded && mod.indexData) {
                             await mod.indexData();
                             await mod.loadIndex();
                         }
                    }
                }
            }
        }
        isToolsLoaded = true;
        console.log(`[System] Dynamically loaded ${allTools.length} tools.`);
    } catch (err) {
        console.error("[System] Failed to dynamically load tools:", err);
    }
}

await loadDynamicTools();

