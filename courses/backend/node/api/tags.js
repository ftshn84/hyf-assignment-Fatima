import express from "express";
import db from "../db.js";

const router = express.Router();

// GET /api/tags
router.get("/", async (request, response) => {
    try {
        const tags = await db("tags").select("id", "created_at", "name").orderBy("name", "asc");
        response.json(tags);
    } catch (error) {
        response.status(500).json({ error: "Failed to fetch tags" });
    }
});

// POST /api/tags
router.post("/", async (request, response) => {
    const { name } = request.body;

    if (typeof name !== "string" || name.trim().length === 0) {
        return response.status(400).json({ error: "name is required" });
    }

    try {
        const normalizedName = name.trim().toLowerCase();
        const inserted = await db("tags").insert({ name: normalizedName }).returning("id");
        const firstInserted = inserted[0];
        const id = typeof firstInserted === "object" ? firstInserted.id : firstInserted;
        const createdTag = await db("tags").where("id", id).select("id", "created_at", "name").first();
        return response.status(201).json(createdTag);
    } catch (error) {
        if (error && typeof error.message === "string" && error.message.includes("UNIQUE")) {
            return response.status(409).json({ error: "Tag already exists" });
        }

        return response.status(500).json({ error: "Failed to create tag" });
    }
});

// GET /api/tags/:id
router.get("/:id", async (request, response) => {
    const tagId = Number(request.params.id);

    if (!Number.isInteger(tagId) || tagId < 1) {
        return response.status(400).json({ error: "Tag id must be a positive integer" });
    }

    try {
        const tag = await db("tags").where("id", tagId).select("id", "created_at", "name").first();

        if (!tag) {
            return response.status(404).json({ error: "Tag not found" });
        }

        return response.json(tag);
    } catch (error) {
        return response.status(500).json({ error: "Failed to fetch tag" });
    }
});

// PUT /api/tags/:id
router.put("/:id", async (request, response) => {
    const tagId = Number(request.params.id);
    const { name } = request.body;

    if (!Number.isInteger(tagId) || tagId < 1) {
        return response.status(400).json({ error: "Tag id must be a positive integer" });
    }

    if (typeof name !== "string" || name.trim().length === 0) {
        return response.status(400).json({ error: "name is required" });
    }

    try {
        const normalizedName = name.trim().toLowerCase();
        const updatedRows = await db("tags").where("id", tagId).update({ name: normalizedName });

        if (updatedRows === 0) {
            return response.status(404).json({ error: "Tag not found" });
        }

        const tag = await db("tags").where("id", tagId).select("id", "created_at", "name").first();
        return response.json(tag);
    } catch (error) {
        if (error && typeof error.message === "string" && error.message.includes("UNIQUE")) {
            return response.status(409).json({ error: "Tag already exists" });
        }

        return response.status(500).json({ error: "Failed to update tag" });
    }
});

// DELETE /api/tags/:id
router.delete("/:id", async (request, response) => {
    const tagId = Number(request.params.id);

    if (!Number.isInteger(tagId) || tagId < 1) {
        return response.status(400).json({ error: "Tag id must be a positive integer" });
    }

    try {
        const deletedRows = await db("tags").where("id", tagId).del();

        if (deletedRows === 0) {
            return response.status(404).json({ error: "Tag not found" });
        }

        return response.status(204).send();
    } catch (error) {
        return response.status(500).json({ error: "Failed to delete tag" });
    }
});

export default router;
