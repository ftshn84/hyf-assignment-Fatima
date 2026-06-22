import express from "express";
import db from "../db.js";

const router = express.Router();

const mapSnippetBase = (row) => ({
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    title: row.title,
    contents: row.contents,
    is_private: row.is_private === 1 || row.is_private === true,
    user: {
        id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
    },
});

const normalizeTagIds = (value) => {
    if (value === undefined) {
        return undefined;
    }

    if (!Array.isArray(value)) {
        return null;
    }

    const ids = value.map((id) => Number(id));
    const allPositiveIntegers = ids.every((id) => Number.isInteger(id) && id > 0);

    if (!allPositiveIntegers) {
        return null;
    }

    return [...new Set(ids)];
};

const getTagsBySnippetIds = async (snippetIds) => {
    if (snippetIds.length === 0) {
        return new Map();
    }

    const rows = await db("snippet_tags")
        .join("tags", "snippet_tags.tag_id", "tags.id")
        .whereIn("snippet_tags.snippet_id", snippetIds)
        .select("snippet_tags.snippet_id", "tags.id", "tags.name")
        .orderBy("tags.name", "asc");

    const tagsMap = new Map();

    rows.forEach((row) => {
        const current = tagsMap.get(row.snippet_id) ?? [];
        current.push({ id: row.id, name: row.name });
        tagsMap.set(row.snippet_id, current);
    });

    return tagsMap;
};

const attachTagsToSnippets = async (snippets) => {
    const snippetIds = snippets.map((snippet) => snippet.id);
    const tagsMap = await getTagsBySnippetIds(snippetIds);

    return snippets.map((snippet) => ({
        ...snippet,
        tags: tagsMap.get(snippet.id) ?? [],
    }));
};

const validateTagIdsExist = async (trx, tagIds) => {
    if (tagIds.length === 0) {
        return true;
    }

    const rows = await trx("tags").whereIn("id", tagIds).select("id");
    return rows.length === tagIds.length;
};

const insertSnippetTags = async (trx, snippetId, tagIds) => {
    if (tagIds.length === 0) {
        return;
    }

    const rows = tagIds.map((tagId) => ({ snippet_id: snippetId, tag_id: tagId }));
    await trx("snippet_tags").insert(rows);
};

// GET /api/snippets
router.get("/", async (request, response) => {
    try {
        const rows = await db("snippets")
            .join("users", "snippets.user_id", "users.id")
            .select(
                "snippets.id",
                "snippets.created_at",
                "snippets.updated_at",
                "snippets.title",
                "snippets.contents",
                "snippets.is_private",
                "users.id as user_id",
                "users.first_name",
                "users.last_name"
            )
            .orderBy("snippets.id", "asc");

        const snippets = rows.map(mapSnippetBase);
        const snippetsWithTags = await attachTagsToSnippets(snippets);

        response.json(snippetsWithTags);
    } catch (error) {
        response.status(500).json({ error: "Failed to fetch snippets" });
    }
});

// POST /api/snippets
router.post("/", async (request, response) => {
    const { user_id, title, contents, is_private, tags } = request.body;
    const userId = Number(user_id);
    const tagIds = normalizeTagIds(tags);

    if (!Number.isInteger(userId) || userId < 1) {
        return response.status(400).json({ error: "user_id must be a positive integer" });
    }

    if (typeof title !== "string" || title.trim().length === 0) {
        return response.status(400).json({ error: "title is required" });
    }

    if (typeof contents !== "string" || contents.trim().length === 0) {
        return response.status(400).json({ error: "contents is required" });
    }

    if (tagIds === null) {
        return response.status(400).json({ error: "tags must be an array of positive integers" });
    }

    try {
        const createdSnippet = await db.transaction(async (trx) => {
            const userExists = await trx("users").where("id", userId).first();
            if (!userExists) {
                return null;
            }

            const safeTagIds = tagIds ?? [];
            const allTagsExist = await validateTagIdsExist(trx, safeTagIds);
            if (!allTagsExist) {
                return false;
            }

            const payload = {
                user_id: userId,
                title: title.trim(),
                contents: contents.trim(),
                is_private: typeof is_private === "boolean" ? is_private : true,
            };

            const inserted = await trx("snippets").insert(payload).returning("id");
            const firstInserted = inserted[0];
            const insertedId = typeof firstInserted === "object" ? firstInserted.id : firstInserted;
            await insertSnippetTags(trx, insertedId, safeTagIds);

            const row = await trx("snippets")
                .join("users", "snippets.user_id", "users.id")
                .where("snippets.id", insertedId)
                .select(
                    "snippets.id",
                    "snippets.created_at",
                    "snippets.updated_at",
                    "snippets.title",
                    "snippets.contents",
                    "snippets.is_private",
                    "users.id as user_id",
                    "users.first_name",
                    "users.last_name"
                )
                .first();

            const snippet = mapSnippetBase(row);
            const withTags = await attachTagsToSnippets([snippet]);
            return withTags[0];
        });

        if (createdSnippet === null) {
            return response.status(400).json({ error: "user_id does not exist" });
        }

        if (createdSnippet === false) {
            return response.status(400).json({ error: "one or more tags do not exist" });
        }

        return response.status(201).json(createdSnippet);
    } catch (error) {
        return response.status(500).json({ error: "Failed to create snippet" });
    }
});

// GET /api/snippets/:id
router.get("/:id", async (request, response) => {
    const snippetId = Number(request.params.id);

    if (!Number.isInteger(snippetId) || snippetId < 1) {
        return response.status(400).json({ error: "Snippet id must be a positive integer" });
    }

    try {
        const row = await db("snippets")
            .join("users", "snippets.user_id", "users.id")
            .where("snippets.id", snippetId)
            .select(
                "snippets.id",
                "snippets.created_at",
                "snippets.updated_at",
                "snippets.title",
                "snippets.contents",
                "snippets.is_private",
                "users.id as user_id",
                "users.first_name",
                "users.last_name"
            )
            .first();

        if (!row) {
            return response.status(404).json({ error: "Snippet not found" });
        }

        const snippet = mapSnippetBase(row);
        const withTags = await attachTagsToSnippets([snippet]);

        response.json(withTags[0]);
    } catch (error) {
        response.status(500).json({ error: "Failed to fetch snippet" });
    }
});

// PUT /api/snippets/:id
router.put("/:id", async (request, response) => {
    const snippetId = Number(request.params.id);
    const { user_id, title, contents, is_private, tags } = request.body;
    const hasTagUpdate = Object.prototype.hasOwnProperty.call(request.body, "tags");
    const tagIds = normalizeTagIds(tags);

    if (!Number.isInteger(snippetId) || snippetId < 1) {
        return response.status(400).json({ error: "Snippet id must be a positive integer" });
    }

    if (hasTagUpdate && tagIds === null) {
        return response.status(400).json({ error: "tags must be an array of positive integers" });
    }

    const payload = {};

    if (user_id !== undefined) {
        const userId = Number(user_id);
        if (!Number.isInteger(userId) || userId < 1) {
            return response.status(400).json({ error: "user_id must be a positive integer" });
        }
        payload.user_id = userId;
    }

    if (title !== undefined) {
        if (typeof title !== "string" || title.trim().length === 0) {
            return response.status(400).json({ error: "title must be a non-empty string" });
        }
        payload.title = title.trim();
    }

    if (contents !== undefined) {
        if (typeof contents !== "string" || contents.trim().length === 0) {
            return response.status(400).json({ error: "contents must be a non-empty string" });
        }
        payload.contents = contents.trim();
    }

    if (is_private !== undefined) {
        if (typeof is_private !== "boolean") {
            return response.status(400).json({ error: "is_private must be a boolean" });
        }
        payload.is_private = is_private;
    }

    if (Object.keys(payload).length === 0 && !hasTagUpdate) {
        return response.status(400).json({ error: "No valid fields provided for update" });
    }

    try {
        const updatedSnippet = await db.transaction(async (trx) => {
            const existingSnippet = await trx("snippets").where("id", snippetId).first();
            if (!existingSnippet) {
                return null;
            }

            if (payload.user_id !== undefined) {
                const userExists = await trx("users").where("id", payload.user_id).first();
                if (!userExists) {
                    return false;
                }
            }

            if (hasTagUpdate) {
                const safeTagIds = tagIds ?? [];
                const allTagsExist = await validateTagIdsExist(trx, safeTagIds);
                if (!allTagsExist) {
                    return "tags-invalid";
                }
            }

            if (Object.keys(payload).length > 0) {
                payload.updated_at = trx.fn.now();
                await trx("snippets").where("id", snippetId).update(payload);
            }

            if (hasTagUpdate) {
                await trx("snippet_tags").where("snippet_id", snippetId).del();
                await insertSnippetTags(trx, snippetId, tagIds ?? []);
            }

            const row = await trx("snippets")
                .join("users", "snippets.user_id", "users.id")
                .where("snippets.id", snippetId)
                .select(
                    "snippets.id",
                    "snippets.created_at",
                    "snippets.updated_at",
                    "snippets.title",
                    "snippets.contents",
                    "snippets.is_private",
                    "users.id as user_id",
                    "users.first_name",
                    "users.last_name"
                )
                .first();

            const snippet = mapSnippetBase(row);
            const withTags = await attachTagsToSnippets([snippet]);
            return withTags[0];
        });

        if (updatedSnippet === null) {
            return response.status(404).json({ error: "Snippet not found" });
        }

        if (updatedSnippet === false) {
            return response.status(400).json({ error: "user_id does not exist" });
        }

        if (updatedSnippet === "tags-invalid") {
            return response.status(400).json({ error: "one or more tags do not exist" });
        }

        return response.json(updatedSnippet);
    } catch (error) {
        return response.status(500).json({ error: "Failed to update snippet" });
    }
});

// DELETE /api/snippets/:id
router.delete("/:id", async (request, response) => {
    const snippetId = Number(request.params.id);

    if (!Number.isInteger(snippetId) || snippetId < 1) {
        return response.status(400).json({ error: "Snippet id must be a positive integer" });
    }

    try {
        const deletedRows = await db.transaction(async (trx) => {
            await trx("snippet_tags").where("snippet_id", snippetId).del();
            return trx("snippets").where("id", snippetId).del();
        });

        if (deletedRows === 0) {
            return response.status(404).json({ error: "Snippet not found" });
        }

        return response.status(204).send();
    } catch (error) {
        return response.status(500).json({ error: "Failed to delete snippet" });
    }
});

export default router;
