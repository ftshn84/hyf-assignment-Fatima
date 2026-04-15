import { teas } from "./teas.js";

// Add Tea class and export it
export class Tea {
    constructor(id, name, type, origin, pricePerGram, caffeineLevel, organic, inStock) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.origin = origin;
        this.pricePerGram = pricePerGram;
        this.caffeineLevel = caffeineLevel;
        this.organic = organic;
        this.inStock = inStock;
    }
    static fromObject(obj) {
        return new Tea(
            obj.id,
            obj.name,
            obj.type,
            obj.origin,
            obj.pricePerGram,
            obj.caffeineLevel,
            obj.organic,
            obj.inStock
        );
    }

    priceFor(grams) {
        return this.pricePerGram * grams;
    }
}
export class Inventory {
    constructor() {
        // Store a Map of tea ID → { tea, stockCount }
        this.items = new Map();
    }

    add(tea, stockCount) {
        // Add a tea to inventory
        this.items.set(tea.id, { tea, stockCount });
    }

    sell(teaName, grams) {
        // Find the tea by name
        for (const [id, item] of this.items.entries()) {
            if (item.tea.name === teaName) {
                if (item.stockCount < grams) {
                    throw new Error(`Not enough stock for ${teaName}`);
                }
                item.stockCount -= grams;
                this.items.set(id, item);
                return;
            }
        }
        throw new Error(`Tea not found: ${teaName}`);
    }

    restock(teaName, grams) {
        // Increase stock
        for (const [id, item] of this.items.entries()) {
            if (item.tea.name === teaName) {
                item.stockCount += grams;
                this.items.set(id, item);
                return;
            }
        }
        throw new Error(`Tea not found: ${teaName}`);
    }

    getStock(teaName) {
        for (const item of this.items.values()) {
            if (item.tea.name === teaName) {
                return item.stockCount;
            }
        }
        throw new Error(`Tea not found: ${teaName}`);
    }

    getLowStock(threshold) {
        // Return array of { tea, stockCount } where stock < threshold
        return Array.from(this.items.values())
            .filter(item => item.stockCount < threshold)
            .map(item => ({ tea: item.tea, stockCount: item.stockCount }));
    }

    getTotalValue() {
        // Sum of (pricePerGram * stockCount) for all items
        return Array.from(this.items.values())
            .reduce((sum, item) => sum + item.tea.pricePerGram * item.stockCount, 0);
    }
}

// Test:
const teaInstances = teas.map(Tea.fromObject);
const inventory = new Inventory();

teaInstances.forEach((tea) => {
    const data = teas.find((t) => t.name === tea.name);
    inventory.add(tea, data.stockCount);
});

console.log("Sencha stock:", inventory.getStock("Sencha")); // 150

inventory.sell("Sencha", 50);
console.log("After selling 50g:", inventory.getStock("Sencha")); // 100

console.log("Low stock (< 50):");
inventory.getLowStock(50).forEach((item) => {
    console.log(`- ${item.tea.name}: ${item.stockCount}g`);
});

console.log(
    "Total inventory value:",
    inventory.getTotalValue().toFixed(2),
    "DKK",
);