export const timeTools = [
    {
        name: "current_date",
        priority: 10,
        description: "Get the current date",
        matchRule: (q) => /\b(date|today)\b/i.test(q),
        confidenceScore: (q) => /\b(today|date)\b/i.test(q) ? 1.0 : 0.7,
        validationRule: (res) => res.status === "success" && !!res.data,
        schema: { type: "object", properties: {} },
        execute: async () => {
            return { status: "success", data: new Date().toDateString(), message: "Current date retrieved" };
        }
    },
    {
        name: "current_time",
        priority: 10,
        description: "Get the current time",
        matchRule: (q) => /\b(time|now)\b/i.test(q),
        confidenceScore: (q) => /\b(time|now)\b/i.test(q) ? 1.0 : 0.7,
        validationRule: (res) => res.status === "success" && !!res.data,
        schema: { type: "object", properties: {} },
        execute: async () => {
            return { status: "success", data: new Date().toLocaleTimeString(), message: "Current time retrieved" };
        }
    },
    {
        name: "current_date_time",
        priority: 10,
        description: "Get the current date and time",
        matchRule: (q) => /\b(date\s+and\s+time|time\s+and\s+date|history)\b/i.test(q),
        confidenceScore: (q) => /\b(date\s+and\s+time|time\s+and\s+date)\b/i.test(q) ? 1.0 : 0.8,
        validationRule: (res) => res.status === "success" && !!res.data,
        schema: { type: "object", properties: {} },
        execute: async () => {
            return { status: "success", data: new Date().toString(), message: "Current date/time retrieved" };
        }
    }
];

