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
const firstTea = teas[1];
const tea = new Tea(
  firstTea.name,
  firstTea.type,
  firstTea.origin,
  firstTea.pricePerGram,
  firstTea.organic,
);
console.log(tea);

//const sencha = new Tea("Sencha", "green", "Japan");
//const earlGrey = new Tea("Earl Grey", "black", "India");

//console.log(sencha.name); // "Sencha"
//console.log(sencha.type); // "green"
//console.log(earlGrey.origin); // "India"