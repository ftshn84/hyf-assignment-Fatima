class Tea {
    constructor(name, type, origin, pricePerGram, organic) {
        this.name = name;
        this.type = type;
        this.origin = origin;
        this.pricePerGram = pricePerGram;
        this.organic = organic;
    }
    describe() {
        const pricePer100g = (this.pricePerGram * 100).toFixed(2);
        return `${this.name} (${this.type}) from ${this.origin} - ${pricePer100g} DKK/100g`;
    }
}

const sencha = new Tea("Sencha", "green", "Japan", 0.12, true);
console.log(sencha.describe());
// "Sencha (green) from Japan - 12.00 DKK/100g"

const earlGrey = new Tea("Earl Grey", "black", "India", 0.08, false);
console.log(earlGrey.describe());
// "Earl Grey (black) from India - 8.00 DKK/100g"