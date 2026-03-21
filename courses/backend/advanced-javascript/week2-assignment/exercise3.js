
import { validateOrder, calculateTotal, checkStock, order } from "./exercise2.js";

function processOrder(order) {
    console.log("Processing order", order.id);

    validateOrder(order, (validation) => {
        if (!validation.valid) {
            console.log("Validation failed:", validation.errors);
            return;
        }
        console.log("Validation passed");

        calculateTotal(order, (pricing) => {
            console.log("Total:", pricing.total, "DKK");

            checkStock(order, (stock) => {
                if (stock.inStock) {
                    console.log("Order can be fulfilled!");
                } else {
                    console.log("Order cannot be fulfilled. Shortages:", stock.shortages);
                }
            });
        });
    });
}

processOrder(order);

