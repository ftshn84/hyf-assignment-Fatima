import { teas } from "./teas.js";
import { Tea, Inventory } from "./exercise1.js";
import { OrderItem, Order } from "./exercise2.js";
import { Customer } from "./exercise4.js";
class TeaShop {
    constructor(teaData) {
        // Create a TeaCatalog from the data (array of Tea instances)
        this.catalog = teaData.map(Tea.fromObject);
        // Create an Inventory from the data
        this.inventory = new Inventory();
        this.catalog.forEach((tea, i) => {
            this.inventory.add(tea, teaData[i].stockCount);
        });
        // Store customers as an empty array
        this.customers = [];
    }

    registerCustomer(name, email) {
        const customer = new Customer(name, email);
        this.customers.push(customer);
        return customer;
    }

    createOrder(customer, items) {
        // 1. Find each tea in the catalog
        const orderItems = items.map(({ teaName, grams }) => {
            const tea = this.catalog.find(t => t.name === teaName);
            if (!tea) throw new Error(`Tea not found: ${teaName}`);
            // 2. Check stock in inventory
            if (this.inventory.getStock(teaName) < grams) {
                throw new Error(`Not enough stock for ${teaName}`);
            }
            return new OrderItem(tea, grams);
        });
        // 3. Create Order and add items
        const order = new Order();
        orderItems.forEach(item => order.addItem(item));
        // 4. Sell from inventory
        orderItems.forEach(item => this.inventory.sell(item.tea.name, item.grams));
        // 5. Place order on the customer
        customer.placeOrder(order);
        // 6. Return the order
        return order;
    }

    getReport() {
        // Total customers
        const totalCustomers = this.customers.length;
        // Total orders
        const totalOrders = this.customers.reduce((sum, c) => sum + c.orders.length, 0);
        // Total revenue
        const totalRevenue = this.customers.reduce((sum, c) => sum + c.totalSpent(), 0);
        // Low stock items (threshold: 50g)
        const lowStock = this.inventory.getLowStock ? this.inventory.getLowStock(50) : [];
        let report = [];
        report.push(`Total customers: ${totalCustomers}`);
        report.push(`Total orders: ${totalOrders}`);
        report.push(`Total revenue: ${totalRevenue.toFixed(2)} DKK`);
        report.push("Low stock items (< 50g):");
        if (lowStock.length === 0) {
            report.push("  None");
        } else {
            lowStock.forEach(item => {
                report.push(`  ${item.tea.name}: ${item.stockCount}g`);
            });
        }
        return report.join("\n");
    }
}

// Test:
const shop = new TeaShop(teas);

const alex = shop.registerCustomer("Alex", "alex@example.com");
const maria = shop.registerCustomer("Maria", "maria@example.com");

const order1 = shop.createOrder(alex, [
    { teaName: "Sencha", grams: 100 },
    { teaName: "Matcha", grams: 50 },
]);
console.log(order1.getSummary());

const order2 = shop.createOrder(maria, [{ teaName: "Earl Grey", grams: 200 }]);
console.log(order2.getSummary());

console.log(shop.getReport());