import { evaluate } from "mathjs";

export const calculatorTools = [
    {
        name: "calculator",
        priority: 10,
        description: "Evaluate a mathematical expression safely. Supports advanced math like sin(), cos(), ! (factorial), and basic arithmetic.",
        matchRule: (q) => /[\d\+\-\*\/\!\^\(\)\.\=]/.test(q) && /[0-9]/.test(q),
        confidenceScore: (q) => /^[0-9\+\-\*\/\!\^\(\)\.\s]+$/.test(q) ? 1.0 : 0.8,
        validationRule: (res) => res.status === "success" && res.data !== null && !isNaN(parseFloat(res.data)),
        schema: {
            type: "object",
            properties: {
                expression: { type: "string", description: "The mathematical expression to evaluate" }
            },
            required: ["expression"]
        },
        execute: async ({ expression }) => {
            try {
                const result = evaluate(expression.toLowerCase());
                return { status: "success", data: result.toString(), message: `Calculated: ${expression}` };
            } catch (err) {
                return { status: "error", data: null, message: err.message };
            }
        }

    }
];
