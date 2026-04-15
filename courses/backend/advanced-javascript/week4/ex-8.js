class Tea {
    constructor(name, pricePerGram, organic) {
        this.name = name;
        this.organic = organic;
        this.pricePerGram = pricePerGram;

    }
    priceFor(grams) {
        return this.pricePerGram * grams;
    }
}

class OrderItem {
    constructor(tea, grams) {
        this.tea = tea;
        this.grams = grams;

        // store the tea instance and grams
    }

    lineTotal() {
        // use the tea's priceFor method
        return this.tea.priceFor(this.grams);
    }
}

const sencha = new Tea("Sencha", 0.52);
const item = new OrderItem(sencha, 600);

console.log(item.tea.name); // "Sencha"
console.log(item.grams); // 600
console.log(item.lineTotal()); // 312
console.log(item.tea.organic); // undefined