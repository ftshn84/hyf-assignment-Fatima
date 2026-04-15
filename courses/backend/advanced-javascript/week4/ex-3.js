import { teas } from "../teas.js";
class Tea {
    constructor(name, type, origin, pricePerGram, organic) {
        this.name = name;
        this.type = type;
        this.origin = origin;
        this.pricePerGram = pricePerGram;
        this.organic = organic;
    }
}

const teaInstances = teas.map(
    (t) => new Tea(t.name, t.type, t.origin, t.pricePerGram, t.organic),
);
console.log(teaInstances.length); // 20
console.log(teaInstances[0].name); // "Sencha"