import Handlebars from "handlebars";

// Test 1: Basic raw block
console.log("=== Test 1: Basic raw block ===");
const template1 = "{{{{raw}}}}Hello {{name}}!{{{{/raw}}}}";
try {
  const compiled1 = Handlebars.compile(template1);
  const result1 = compiled1({ name: "World" });
  console.log("Template:", template1);
  console.log("Result:", result1);
} catch (error) {
  console.log("Error:", error.message);
}

// Test 2: Template literal syntax (with backticks)
console.log("\n=== Test 2: Template literal syntax ===");
const template2 = `{{{{raw}}}}
import React from 'react';

export function Component() {
  return <div>Hello {{name}}!</div>;
}
{{{{/raw}}}}`;

try {
  const compiled2 = Handlebars.compile(template2);
  const result2 = compiled2({ name: "World" });
  console.log("Template length:", template2.length);
  console.log("Result length:", result2.length);
  console.log("Result:", JSON.stringify(result2));
} catch (error) {
  console.log("Error:", error.message);
}

// Test 3: Regular string syntax (no backticks, like in actual .hbs files)
console.log("\n=== Test 3: Regular string syntax ===");
const template3 =
  "{{{{raw}}}}\nimport React from 'react';\n\nexport function Component() {\n  return <div>Hello {{name}}!</div>;\n}\n{{{{/raw}}}}";

try {
  const compiled3 = Handlebars.compile(template3);
  const result3 = compiled3({ name: "World" });
  console.log("Template length:", template3.length);
  console.log("Result length:", result3.length);
  console.log("Result:", JSON.stringify(result3));
} catch (error) {
  console.log("Error:", error.message);
}

// Test 3: Check Handlebars version
console.log("\n=== Handlebars Version ===");
console.log("Version:", Handlebars.VERSION);

// Test 4: Read actual template file
console.log("\n=== Test 4: Actual template file ===");
import fs from "fs";
try {
  const actualTemplate = fs.readFileSync(
    "./templates/ai-chat/apps/web/src/components/chat/TypingIndicator.tsx.hbs",
    "utf-8"
  );
  console.log("Actual template content:");
  console.log(actualTemplate);
  console.log("Template length:", actualTemplate.length);

  const compiled4 = Handlebars.compile(actualTemplate);
  const result4 = compiled4({ name: "World" });
  console.log("Result length:", result4.length);
  console.log("Result:", JSON.stringify(result4));
} catch (error) {
  console.log("Error reading template:", error.message);
}
