import { teas } from "./teas.js";
export class Tea {
    constructor(name, type, origin, pricePerGram, organic) {
        // Validate:
        // - name must be a non-empty string
        if (typeof name !== "string" || name.trim() === "") {
            throw new Error("Name is required");
        }
        // - type must be one of: "green", "black", "herbal", "oolong", "white"
        const validTypes = ["green", "black", "herbal", "oolong", "white"];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid type: ${type}`);
        }
        // - pricePerGram must be a positive number
        if (typeof pricePerGram !== "number" || pricePerGram <= 0) {
            throw new Error("Price per gram must be positive");
        }
        // Store all properties
        this.name = name;
        this.type = type;
        this.origin = origin;
        this.pricePerGram = pricePerGram;
        this.organic = organic;
    }

    priceFor(grams) {
        return this.pricePerGram * grams;
    }

    describe() {
        const pricePer100g = (this.pricePerGram * 100).toFixed(2);
        let desc = `${this.name} (${this.type}) from ${this.origin} - ${pricePer100g} DKK/100g`;
        if (this.organic) {
            desc += " [organic]";
        }
        return desc;
    }

    static fromObject(obj) {
        return new Tea(
            obj.name,
            obj.type,
            obj.origin,
            obj.pricePerGram,
            obj.organic
        );
    }
}

// Test validation:
try {
    new Tea("", "green", "Japan", 0.12, true);
} catch (e) {
    console.log(e.message);
} // "Name is required"

try {
    new Tea("Test", "purple", "Japan", 0.12, true);
} catch (e) {
    console.log(e.message);
} // "Invalid type: purple"

// Test factory method:
const teaInstances = teas.map(Tea.fromObject);
console.log(teaInstances.length); // 20
console.log(teaInstances[0].describe());
// "Sencha (green) from Japan - 12.00 DKK/100g [organic]"
console.log(teaInstances[1].describe());
// "Earl Grey (black) from India - 8.00 DKK/100g"