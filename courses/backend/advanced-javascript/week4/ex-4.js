
// Should work:
class Tea {
    constructor(name, type, origin, pricePerGram, organic) {

        if (!name) {
            throw new Error("Name is required");
        }
        if (pricePerGram <= 0) {
            throw new Error("Price must be positive");
        }
        const valid = ["Sencha", "green", "Japan", 0.12, true];
        if (!valid.includes(type)) {

            throw new Error(`Invalid type: ${type}`);
        }



        this.name = name;
        this.type = type;
        this.origin = origin;
        this.pricePerGram = pricePerGram;
        this.organic = organic;
    }
}

try {
    console.log("Creating valid tea...");
    const valid = new Tea("Sencha", "green", "Japan", 0.12, true);
    console.log("Valid tea created:", valid);
} catch (e) {
    console.error("Error creating valid tea:", e.message);
}

try {
    console.log("Creating tea with no name...");
    const noName = new Tea("", "green", "Japan", 0.12, true);
    console.log("Tea with no name created:", noName);
} catch (e) {
    console.error("Error creating tea with no name:", e.message);
}

try {
    console.log("Creating tea with bad price...");
    const badPrice = new Tea("Sencha", "green", "Japan", -1, true);
    console.log("Tea with bad price created:", badPrice);
} catch (e) {
    console.error("Error creating tea with bad price:", e.message);
}


//const badType = new Tea("Sencha", "purple", "Japan", 0.12, true);
// Error: "Invalid type: purple"

