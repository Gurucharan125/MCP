import fs from "fs/promises";
import natural from "natural";

export const summerizeTools = [
    {
        name: "summerize_text",
        priority: 7,
        description: "Summarizes text or a file using TF-IDF natural language processing. Provide raw text or a file path.",
        matchRule: (q) => /\b(summarize|summarise|summary|gist|shorten)\b/i.test(q),
        confidenceScore: (q) => /\b(summarize|summary)\b/i.test(q) ? 1.0 : 0.7,
        validationRule: (res) => res.status === "success" && res.data !== null && res.data.length > 0,
        directResult: true, // Output cleanly instead of passing back to LLM
        schema: {
            type: "object",
            properties: {
                text: { type: "string", description: "Raw text to summarize" },
                path: { type: "string", description: "Path to the file to summarize" },
                sentences: { type: "number", description: "Number of sentences to include in the summary (default 4)" }
            }
        },
        execute: async ({ text, path, sentences = 4 }) => {
            let content = text;
            if (path) {
                try {
                    content = await fs.readFile(path, "utf8");
                } catch (e) {
                    return { status: "error", data: null, message: `Could not read file ${path}: ${e.message}` };
                }
            }

            if (!content || content.trim().length === 0) {
                return { status: "error", data: null, message: "No text provided to summarize." };
            }

            const tokenizer = new natural.SentenceTokenizer();
            const sentenceTokens = tokenizer.tokenize(content);

            if (sentenceTokens.length <= sentences) {
                return { status: "success", data: content, message: "Text is already shorter than or equal to the desired summary length." };
            }

            const TfIdf = natural.TfIdf;
            const tfidf = new TfIdf();

            // Treat each sentence as a document
            sentenceTokens.forEach(sentence => {
                tfidf.addDocument(sentence);
            });

            // Use the full text as the query to find sentences that best represent the overall vocabulary
            const wordTokenizer = new natural.WordTokenizer();
            const fullVocab = wordTokenizer.tokenize(content).join(" ");
            
            const scores = [];
            
            tfidf.tfidfs(fullVocab, function(i, measure) {
                scores.push({ index: i, measure: measure, text: sentenceTokens[i] });
            });

            // Sort by highest score
            scores.sort((a, b) => b.measure - a.measure);

            // Take the top N sentences and format them sequentially
            const topSentences = scores.slice(0, sentences)
                .sort((a, b) => a.index - b.index) // Keep original chronological order
                .map(s => s.text.trim());

            return { 
                status: "success", 
                data: topSentences.join(" "), 
                message: `Summarized an original text of ${sentenceTokens.length} sentences down to ${sentences}.` 
            };
        }
    }
];
