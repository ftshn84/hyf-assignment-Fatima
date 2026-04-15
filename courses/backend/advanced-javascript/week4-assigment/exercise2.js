import { teas } from "./teas.js";
import { Tea } from "./exercise1.js";

class OrderItem {

    constructor(tea, grams) {
        if (typeof grams !== "number" || grams <= 0) {
            throw new Error("Grams must be a positive number");
        }
        this.tea = tea;
        this.grams = grams;
    }

    lineTotal() {
        // Use tea.priceFor()
        return this.tea.priceFor(this.grams);
    }

    describe() {
        // "200g Sencha - 24.00 DKK"
        return `${this.grams}g ${this.tea.name} - ${this.lineTotal().toFixed(2)} DKK`;
    }
}

class Order {
    constructor() {
        this.items = [];
        this.status = "pending";
    }

    addItem(orderItem) {
        if (this.status === "pending") {
            this.items.push(orderItem);
        } else {
            throw new Error("Cannot add item to a completed order");
        }
    }

    // Sum all line totals using .reduce()
    getTotal() {
        return this.items.reduce((total, item) => total + item.lineTotal(), 0);
    }

    getSummary() {
        const lines = [];
        lines.push(`Order (${this.status}) - ${this.items.length} item${this.items.length !== 1 ? 's' : ''}`);
        this.items.forEach(item => {
            lines.push(`  ${item.describe()}`);
        });
        lines.push(`Total: ${this.getTotal().toFixed(2)} DKK`);
        return lines.join("\n");
    }
}

// Test:
const teaInstances = teas.map(Tea.fromObject);
const order = new Order();
order.addItem(new OrderItem(teaInstances[0], 200)); // Sencha
order.addItem(new OrderItem(teaInstances[7], 50)); // Matcha

console.log(order.getSummary());
console.log("Total:", order.getTotal().toFixed(2), "DKK");
export { OrderItem, Order };