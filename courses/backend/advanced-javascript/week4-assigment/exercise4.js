import { teas } from "./teas.js";
import { Tea } from "./exercise1.js";
import { OrderItem, Order } from "./exercise2.js";
export class Customer {
    constructor(name, email) {
        this.name = name;
        this.email = email;
        this.orders = [];
    }

    // Confirm the order and add to this.orders
    placeOrder(order) {
        if (typeof order.confirm === 'function') {
            order.confirm();
        } else {
            order.confirmed = true;
        }
        this.orders.push(order);
        return order;
    }

    totalSpent() {
        return this.orders.reduce((sum, order) => {
            if (typeof order.getTotal === 'function') {
                return sum + order.getTotal();
            }
            return sum;
        }, 0);
    }

    getOrderHistory() {
        const lines = [];
        lines.push(`${this.name} (${this.email}) - ${this.orders.length} order${this.orders.length !== 1 ? 's' : ''}`);
        lines.push("");
        this.orders.forEach((order, idx) => {
            const confirmed = order.confirmed || (typeof order.isConfirmed === 'function' && order.isConfirmed());
            const items = order.items || (typeof order.getItems === 'function' ? order.getItems() : []);
            lines.push(`Order ${idx + 1} (${confirmed ? 'confirmed' : 'pending'}) - ${items.length} item${items.length !== 1 ? 's' : ''}`);
            items.forEach(item => {
                // item.tea, item.grams, item.getTotal()
                const teaName = item.tea?.name || (item.getTea ? item.getTea().name : '');
                const grams = item.grams || (item.getGrams ? item.getGrams() : 0);
                const price = typeof item.getTotal === 'function' ? item.getTotal() : (item.tea?.pricePerGram || 0) * grams;
                lines.push(`  ${grams}g ${teaName} - ${price.toFixed(2)} DKK`);
            });
            const total = typeof order.getTotal === 'function' ? order.getTotal() : 0;
            lines.push(`Total: ${total.toFixed(2)} DKK`);
            lines.push("");
        });
        lines.push(`Lifetime total: ${this.totalSpent().toFixed(2)} DKK`);
        return lines.join("\n");
    }
}

// Test:
const teaInstances = teas.map(Tea.fromObject);
const customer = new Customer("Alex", "alex@example.com");

const order1 = new Order();
order1.addItem(new OrderItem(teaInstances[0], 100)); // Sencha
customer.placeOrder(order1);

const order2 = new Order();
order2.addItem(new OrderItem(teaInstances[7], 50)); // Matcha
customer.placeOrder(order2);

console.log(customer.getOrderHistory());
console.log("Total spent:", customer.totalSpent().toFixed(2), "DKK");