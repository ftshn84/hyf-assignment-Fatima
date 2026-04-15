
class Tea {
    constructor(name, pricePerGram, organic) {
        this.name = name;
        this.pricePerGram = pricePerGram;
        this.organic = organic;
    }
    teaInstances = teas.map(
        (t) => new Tea(t.name, t.pricePerGram, t.organic),
    );
    priceFor(grams) {
        return this.pricePerGram * grams;
    }
}
const item = new OrderItem(sencha, 200);
console.log(item.describe());

// "200g Sencha - 24.00 DKK"
const items = [
    new OrderItem(teaInstances[0], 100),
    new OrderItem(teaInstances[1], 200),
    new OrderItem(teaInstances[7], 50),
];

items.map((item) => item.describe()).forEach((line) => console.log(line));

// "100g Sencha - 12.00 DKK"
// "200g Earl Grey - 16.00 DKK"
// "50g Matcha - 22.50 DKK"