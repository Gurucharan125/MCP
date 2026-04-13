import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ooshsymupswnebcqrjrm.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_OqQMPU9kVpiOWPmwonQ8uQ_4ISvWtZm";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const databaseTools = [
    {
        name: "query_supabase",
        priority: 8,
        description: "Query rows from a Supabase database table. Returns a JSON string of results.",
        matchRule: (q) => /\b(query|database|table|supabase)\b/i.test(q),
        confidenceScore: (q) => /\b(query|database|table|supabase)\b/i.test(q) ? 0.9 : 0.6,
        validationRule: (res) => res.status === "success" && Array.isArray(res.data),
        schema: {
            type: "object",
            properties: {
                table: { type: "string", description: "The name of the database table to query" },
                select: { type: "string", description: "The columns to select, comma separated. Use '*' for all." },
                limit: { type: "number", description: "Maximum number of rows to return (default 10, max 100)" },
                filter_column: { type: "string", description: "The column name to filter by (optional)" },
                filter_value: { type: "string", description: "The value to match in the filter column (optional)" }
            },
            required: ["table"]
        },
        execute: async ({ table, select = "*", limit = 10, filter_column, filter_value }) => {
            if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
                return { status: "error", data: null, message: "Supabase is not configured. Add credentials to .env" };
            }

            const maxLimit = Math.min(limit, 100);

            try {
                let queryBuilder = supabase
                    .from(table)
                    .select(select);

                if (filter_column && filter_value) {
                    queryBuilder = queryBuilder.eq(filter_column, filter_value);
                }

                const { data, error } = await queryBuilder.limit(maxLimit);

                if (error) {
                    return { status: "error", data: null, message: `Supabase Query Error: ${error.message}` };
                }

                return { status: "success", data, message: `Queried ${data.length} rows from ${table}` };
            } catch (err) {
                return { status: "error", data: null, message: err.message };
            }
        }

    }
];
