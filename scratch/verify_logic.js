function parseSku(sku) {
    return (sku && typeof sku === "string" && sku.trim() !== "") ? sku.trim() : null;
}

function parsePrice(price) {
    return (price !== undefined && price !== "" && price !== "null") ? parseFloat(price) : 0;
}

function parseStock(stock) {
    return (stock !== undefined && stock !== "" && stock !== "null") ? parseInt(stock) : 0;
}

const testCases = [
    { input: "", expected: null, fn: parseSku, name: "Empty SKU" },
    { input: "  ", expected: null, fn: parseSku, name: "Whitespace SKU" },
    { input: "SKU123", expected: "SKU123", fn: parseSku, name: "Valid SKU" },
    { input: "", expected: 0, fn: parsePrice, name: "Empty Price" },
    { input: "10.5", expected: 10.5, fn: parsePrice, name: "Valid Price" },
    { input: "null", expected: 0, fn: parsePrice, name: "String Null Price" },
    { input: undefined, expected: 0, fn: parsePrice, name: "Undefined Price" },
    { input: "5", expected: 5, fn: parseStock, name: "Valid Stock" },
];

testCases.forEach(tc => {
    const result = tc.fn(tc.input);
    if (result === tc.expected) {
        console.log(`PASS: ${tc.name}`);
    } else {
        console.log(`FAIL: ${tc.name} (Expected ${tc.expected}, got ${result})`);
    }
});
