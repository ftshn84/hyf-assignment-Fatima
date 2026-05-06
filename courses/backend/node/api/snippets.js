import express from "express";
import db from "../db.js";

const router = express.Router();

const sendError = (response, status, message) => response.status(status).json({ error: message });

const classifyServerError = (error) => {
    const message = typeof error?.message === "string" ? error.message : "";
    const code = typeof error?.code === "string" ? error.code : "";
    const normalized = `${code} ${message}`.toLowerCase();

    if (normalized.includes("no such table")) {
        return { status: 500, clientMessage: "Database schema error", kind: "missing-table" };
    }

    if (normalized.includes("sqlite_cantopen") || normalized.includes("database is locked") || normalized.includes("connection")) {
        return { status: 500, clientMessage: "Database unavailable", kind: "db-unavailable" };
    }

    return { status: 500, clientMessage: "Internal server error", kind: "unexpected" };
};

const logServerError = (context, error, meta = {}) => {
    const code = typeof error?.code === "string" ? error.code : "unknown";
    const message = typeof error?.message === "string" ? error.message : "Unknown error";
    console.error("[snippets] request failed", {
        context,
        code,
        message,
        ...meta,
    });
};

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

        return response.status(200).json(snippetsWithTags);
    } catch (error) {
        const classified = classifyServerError(error);
        logServerError("list-snippets", error, { method: request.method, path: request.originalUrl });
        return sendError(response, classified.status, classified.clientMessage);
    }
});

// GET /api/snippets/public
router.get("/public", async (request, response) => {
    try {
        const rows = await db("snippets")
            .join("users", "snippets.user_id", "users.id")
            .where("snippets.is_private", false)
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
            .orderBy("snippets.created_at", "desc");

        const snippets = rows.map(mapSnippetBase);
        const snippetsWithTags = await attachTagsToSnippets(snippets);

        return response.status(200).json(snippetsWithTags);
    } catch (error) {
        const classified = classifyServerError(error);
        logServerError("list-public-snippets", error, { method: request.method, path: request.originalUrl });
        return sendError(response, classified.status, classified.clientMessage);
    }
});

// GET /api/snippets/by-tag/:tag
router.get("/by-tag/:tag", async (request, response) => {
    const tagName = String(request.params.tag ?? "").trim().toLowerCase();

    if (tagName.length === 0) {
        return sendError(response, 400, "tag parameter is required");
    }

    try {
        const tag = await db("tags").where("name", tagName).select("id").first();

        if (!tag) {
            return sendError(response, 404, "Tag not found");
        }

        const rows = await db("snippets")
            .join("users", "snippets.user_id", "users.id")
            .join("snippet_tags", "snippets.id", "snippet_tags.snippet_id")
            .where("snippet_tags.tag_id", tag.id)
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

        return response.status(200).json(snippetsWithTags);
    } catch (error) {
        const classified = classifyServerError(error);
        logServerError("list-snippets-by-tag", error, {
            method: request.method,
            path: request.originalUrl,
            tag: tagName,
        });
        return sendError(response, classified.status, classified.clientMessage);
    }
});

// GET /api/snippets/unsafe
router.get("/unsafe", async (request, response) => {
    const sortableColumns = new Set(["created_at", "title"]);
    let query = db.select("*").from("snippets");

    if ("sort" in request.query) {
        const rawSort = request.query.sort.toString().trim();

        if (rawSort.length > 0) {
            const parts = rawSort.split(/\s+/).filter(Boolean);
            const [columnRaw, directionRaw = "asc"] = parts;

            const column = columnRaw.toLowerCase();
            const direction = directionRaw.toLowerCase();
            const isAllowedColumn = sortableColumns.has(column);
            const isAllowedDirection = direction === "asc" || direction === "desc";
            const hasOnlyColumnAndDirection = parts.length <= 2;

            if (!isAllowedColumn || !isAllowedDirection || !hasOnlyColumnAndDirection) {
                return sendError(response, 400, "Invalid sort. Use 'created_at asc|desc' or 'title asc|desc'");
            }

            query = query.orderBy(column, direction);
        }
    }

    console.log("SQL", query.toSQL().sql);

    try {
        const data = await query;
        return response.status(200).json({ data });
    } catch (error) {
        const classified = classifyServerError(error);
        logServerError("unsafe-sort-demo", error, {
            method: request.method,
            path: request.originalUrl,
            sort: request.query.sort,
        });
        return sendError(response, classified.status, classified.clientMessage);
    }
});

// POST /api/snippets
router.post("/", async (request, response) => {
    const { user_id, title, contents, is_private, tags } = request.body;
    const userId = Number(user_id);
    const tagIds = normalizeTagIds(tags);

    if (!Number.isInteger(userId) || userId < 1) {
        return sendError(response, 400, "user_id must be a positive integer");
    }

    if (typeof title !== "string" || title.trim().length === 0) {
        return sendError(response, 400, "title is required");
    }

    if (typeof contents !== "string" || contents.trim().length === 0) {
        return sendError(response, 400, "contents is required");
    }

    if (tagIds === null) {
        return sendError(response, 400, "tags must be an array of positive integers");
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
            return sendError(response, 400, "user_id does not exist");
        }

        if (createdSnippet === false) {
            return sendError(response, 400, "one or more tags do not exist");
        }

        return response.status(201).json(createdSnippet);
    } catch (error) {
        const classified = classifyServerError(error);
        logServerError("create-snippet", error, { method: request.method, path: request.originalUrl });
        return sendError(response, classified.status, classified.clientMessage);
    }
});

// GET /api/snippets/:id
router.get("/:id", async (request, response) => {
    const snippetId = Number(request.params.id);

    if (!Number.isInteger(snippetId) || snippetId < 1) {
        return sendError(response, 400, "Snippet id must be a positive integer");
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
            return sendError(response, 404, "Snippet not found");
        }

        const snippet = mapSnippetBase(row);
        const withTags = await attachTagsToSnippets([snippet]);

        return response.status(200).json(withTags[0]);
    } catch (error) {
        const classified = classifyServerError(error);
        logServerError("get-snippet-by-id", error, {
            method: request.method,
            path: request.originalUrl,
            snippetId,
        });
        return sendError(response, classified.status, classified.clientMessage);
    }
});

// PUT /api/snippets/:id
router.put("/:id", async (request, response) => {
    const snippetId = Number(request.params.id);
    const { user_id, title, contents, is_private, tags } = request.body;
    const hasTagUpdate = Object.prototype.hasOwnProperty.call(request.body, "tags");
    const tagIds = normalizeTagIds(tags);

    if (!Number.isInteger(snippetId) || snippetId < 1) {
        return sendError(response, 400, "Snippet id must be a positive integer");
    }

    if (hasTagUpdate && tagIds === null) {
        return sendError(response, 400, "tags must be an array of positive integers");
    }

    const payload = {};

    if (user_id !== undefined) {
        const userId = Number(user_id);
        if (!Number.isInteger(userId) || userId < 1) {
            return sendError(response, 400, "user_id must be a positive integer");
        }
        payload.user_id = userId;
    }

    if (title !== undefined) {
        if (typeof title !== "string" || title.trim().length === 0) {
            return sendError(response, 400, "title must be a non-empty string");
        }
        payload.title = title.trim();
    }

    if (contents !== undefined) {
        if (typeof contents !== "string" || contents.trim().length === 0) {
            return sendError(response, 400, "contents must be a non-empty string");
        }
        payload.contents = contents.trim();
    }

    if (is_private !== undefined) {
        if (typeof is_private !== "boolean") {
            return sendError(response, 400, "is_private must be a boolean");
        }
        payload.is_private = is_private;
    }

    if (Object.keys(payload).length === 0 && !hasTagUpdate) {
        return sendError(response, 400, "No valid fields provided for update");
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
            return sendError(response, 404, "Snippet not found");
        }

        if (updatedSnippet === false) {
            return sendError(response, 400, "user_id does not exist");
        }

        if (updatedSnippet === "tags-invalid") {
            return sendError(response, 400, "one or more tags do not exist");
        }

        return response.json(updatedSnippet);
    } catch (error) {
        const classified = classifyServerError(error);
        logServerError("update-snippet", error, {
            method: request.method,
            path: request.originalUrl,
            snippetId,
        });
        return sendError(response, classified.status, classified.clientMessage);
    }
});

// DELETE /api/snippets/:id
router.delete("/:id", async (request, response) => {
    const snippetId = Number(request.params.id);

    if (!Number.isInteger(snippetId) || snippetId < 1) {
        return sendError(response, 400, "Snippet id must be a positive integer");
    }

    try {
        const deletedRows = await db.transaction(async (trx) => {
            await trx("snippet_tags").where("snippet_id", snippetId).del();
            return trx("snippets").where("id", snippetId).del();
        });

        if (deletedRows === 0) {
            return sendError(response, 404, "Snippet not found");
        }

        return response.status(204).send();
    } catch (error) {
        const classified = classifyServerError(error);
        logServerError("delete-snippet", error, {
            method: request.method,
            path: request.originalUrl,
            snippetId,
        });
        return sendError(response, classified.status, classified.clientMessage);
    }
});

router.use((error, request, response, next) => {
    const classified = classifyServerError(error);
    logServerError("router-catch-all", error, {
        method: request.method,
        path: request.originalUrl,
    });

    if (response.headersSent) {
        return next(error);
    }

    return sendError(response, classified.status, classified.clientMessage);
});

export default router;
