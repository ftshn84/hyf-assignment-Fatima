import fs from "fs";
import { teas } from "../data/teas.js";

// Exercise 4: Inventory Aggregation from File
function generateInventoryReport(callback) {
    fs.readFile("./inventory-updates.json", "utf8", (error, data) => {
        if (error) {
            callback(error, null);
            return;
        }
        let updates;
        try {
            updates = JSON.parse(data);
        } catch (parseErr) {
            callback(parseErr, null);
            return;
        }
        // Calculate net change per teaId
        const netChanges = updates.reduce((acc, update) => {
            acc[update.teaId] = (acc[update.teaId] || 0) + update.change;
            return acc;
        }, {});

        // Build report
        let report = "Inventory Report:";
        for (const tea of teas) {
            if (netChanges[tea.id] !== undefined) {
                const was = tea.stockCount;
                const change = netChanges[tea.id];
                const now = was + change;
                report += `\n- ${tea.name}: was ${was}, change ${(change >= 0 ? "+" : "") + change}, now ${now}`;
                if (now < 0) {
                    report += " (NEGATIVE!)";
                }
            }
        }
        callback(null, report);
    });
}

generateInventoryReport((error, report) => {
    if (error) {
        console.error("Failed:", error.message);
        return;
    }
    console.log(report);
});
