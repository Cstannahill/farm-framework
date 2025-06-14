// Simple CJS Handlebars test to isolate the issue
const Handlebars = require("handlebars");

console.log("=== HANDLEBARS DEBUG TEST ===");
console.log("Handlebars imported successfully");

// TEST 1: Test without the eq helper (should fail)
console.log("\n--- TEST 1: Without eq helper ---");
try {
  const templateContent1 = `{{#unless (eq template "api-only")}}packages: - 'apps/*'{{/unless}}`;
  const compiledTemplate1 = Handlebars.compile(templateContent1);
  const result1 = compiledTemplate1({ template: "basic" });
  console.log("SUCCESS (unexpected):", result1);
} catch (error) {
  console.log("EXPECTED ERROR:", error.message);
}

// TEST 2: Register eq helper and test again
console.log("\n--- TEST 2: With eq helper registered ---");
Handlebars.registerHelper("eq", function (a, b, options) {
  console.log("eq helper called with:", a, "===", b, "?", a === b);
  return a === b ? options.fn(this) : options.inverse(this);
});

try {
  const templateContent2 = `{{#unless (eq template "api-only")}}packages:
  - 'apps/*'{{/unless}}`;
  console.log("Template:", templateContent2);
  const compiledTemplate2 = Handlebars.compile(templateContent2);
  const result2 = compiledTemplate2({ template: "basic" });
  console.log("SUCCESS:", JSON.stringify(result2));
} catch (error) {
  console.log("ERROR:", error.message);
  console.log("STACK:", error.stack);
}

console.log("\n=== END TEST ===");
