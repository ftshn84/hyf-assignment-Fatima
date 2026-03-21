
import { teas } from "../data/teas.js";

export const order = {
    id: 1001,
    customerId: 42,
    items: [
        { teaId: 1, grams: 100 },
        { teaId: 8, grams: 50 },
        { teaId: 3, grams: 200 },
    ],
};


// 1. validateOrder(order, callback) - 200ms delay
export function validateOrder(order, callback) {
    setTimeout(() => {
        const errors = [];
        for (const item of order.items) {
            const teaExists = teas.some(tea => tea.id === item.teaId);
            if (!teaExists) {
                errors.push(`Tea with id ${item.teaId} does not exist.`);
            }
        }
        callback({ valid: errors.length === 0, errors });
    }, 200);
}

// 2. calculateTotal(order, callback) - 300ms delay
export function calculateTotal(order, callback) {
    setTimeout(() => {
        let total = 0;
        for (const item of order.items) {
            const tea = teas.find(tea => tea.id === item.teaId);
            if (tea) {
                total += tea.pricePerGram * item.grams;
            }
        }
        callback({ orderId: order.id, total });
    }, 300);
}

// 3. checkStock(order, callback) - 400ms delay
export function checkStock(order, callback) {
    setTimeout(() => {
        const shortages = [];
        let inStock = true;
        for (const item of order.items) {
            const tea = teas.find(tea => tea.id === item.teaId);
            if (!tea || tea.stockCount < item.grams) {
                shortages.push(`Not enough stock for tea id ${item.teaId}`);
                inStock = false;
            }
        }
        callback({ orderId: order.id, inStock, shortages });
    }, 400);
}

// Test validateOrder
validateOrder(order, (result) => {
    console.log("Validation result:", result);
});

// Test calculateTotal
calculateTotal(order, (result) => {
    console.log("Total result:", result);
});

// Test checkStock
checkStock(order, (result) => {
    console.log("Stock result:", result);
});