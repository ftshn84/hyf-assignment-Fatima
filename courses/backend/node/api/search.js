import express from "express";
import db from "../db.js";

const router = express.Router();

const mapSnippet = (row) => ({
    id: row.id,
    title: row.title,
    contents: row.contents,
});

const getTagsBySnippetIds = async (snippetIds) => {
    if (snippetIds.length === 0) {
        return new Map();
    }

    const rows = await db("snippet_tags")
        .join("tags", "snippet_tags.tag_id", "tags.id")
        .whereIn("snippet_tags.snippet_id", snippetIds)
        .select("snippet_tags.snippet_id", "tags.name")
        .orderBy("tags.name", "asc");

    const tagsMap = new Map();

    rows.forEach((row) => {
        const current = tagsMap.get(row.snippet_id) ?? [];
        current.push(row.name);
        tagsMap.set(row.snippet_id, current);
    });

    return tagsMap;
};

const attachTags = async (snippets) => {
    const snippetIds = snippets.map((snippet) => snippet.id);
    const tagsMap = await getTagsBySnippetIds(snippetIds);

    return snippets.map((snippet) => ({
        ...snippet,
        tags: tagsMap.get(snippet.id) ?? [],
    }));
};

const findSnippetsByQ = async (q) => {
    const query = db("snippets").select("id", "title", "contents").orderBy("id", "asc");

    if (q !== undefined) {
        const normalizedQ = String(q).trim().toLowerCase();

        if (normalizedQ.length > 0) {
            const tagMatchIds = await db("snippet_tags")
                .join("tags", "snippet_tags.tag_id", "tags.id")
                .whereILike("tags.name", `%${normalizedQ}%`)
                .select("snippet_tags.snippet_id");

            const idsFromTags = [...new Set(tagMatchIds.map((row) => row.snippet_id))];

            query.where((builder) => {
                builder
                    .whereILike("title", `%${normalizedQ}%`)
                    .orWhereILike("contents", `%${normalizedQ}%`);

                if (idsFromTags.length > 0) {
                    builder.orWhereIn("id", idsFromTags);
                }
            });
        }
    }

    const rows = await query;
    const snippets = rows.map(mapSnippet);
    return attachTags(snippets);
};

const filterByFields = async (snippets, fields) => {
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
        return null;
    }

    const supportedKeys = ["title", "contents", "tags"];
    const keys = Object.keys(fields);

    const hasUnsupportedKey = keys.some((key) => !supportedKeys.includes(key));
    if (hasUnsupportedKey) {
        return null;
    }

    let filtered = snippets;

    if (fields.title !== undefined) {
        if (typeof fields.title !== "string") {
            return null;
        }
        const value = fields.title.trim().toLowerCase();
        filtered = filtered.filter((snippet) => snippet.title.toLowerCase().includes(value));
    }

    if (fields.contents !== undefined) {
        if (typeof fields.contents !== "string") {
            return null;
        }
        const value = fields.contents.trim().toLowerCase();
        filtered = filtered.filter((snippet) => snippet.contents.toLowerCase().includes(value));
    }

    if (fields.tags !== undefined) {
        if (typeof fields.tags !== "string") {
            return null;
        }
        const value = fields.tags.trim().toLowerCase();
        filtered = filtered.filter((snippet) => snippet.tags.some((tag) => tag.toLowerCase().includes(value)));
    }

    return filtered;
};

// GET /search?q=value
router.get("/search", async (request, response) => {
    const { q } = request.query;

    try {
        const snippets = await findSnippetsByQ(q);
        response.json(snippets);
    } catch (error) {
        response.status(500).json({ error: "Failed to search snippets" });
    }
});

// GET /snippets/:id
router.get("/snippets/:id", async (request, response) => {
    const snippetId = Number(request.params.id);

    if (!Number.isInteger(snippetId) || snippetId < 1) {
        return response.status(400).json({ error: "Snippet id must be a positive integer" });
    }

    try {
        const row = await db("snippets")
            .where("id", snippetId)
            .select("id", "title", "contents")
            .first();

        if (!row) {
            return response.status(404).json({ error: "Snippet not found" });
        }

        const withTags = await attachTags([mapSnippet(row)]);
        return response.json(withTags[0]);
    } catch (error) {
        return response.status(500).json({ error: "Failed to fetch snippet" });
    }
});

// POST /search?q=value
router.post("/search", async (request, response) => {
    const { q } = request.query;
    const { fields } = request.body;
    const hasQ = q !== undefined && String(q).trim().length > 0;
    const hasFields = fields !== undefined;

    if (hasQ && hasFields) {
        return response.status(400).json({ error: "Provide either q query parameter or fields body, not both" });
    }

    try {
        const snippets = await findSnippetsByQ(q);

        if (!hasFields) {
            return response.json(snippets);
        }

        const filtered = await filterByFields(snippets, fields);
        if (filtered === null) {
            return response.status(400).json({ error: "fields must be an object with optional title, contents, or tags string filters" });
        }

        return response.json(filtered);
    } catch (error) {
        return response.status(500).json({ error: "Failed to search snippets" });
    }
});

export default router;