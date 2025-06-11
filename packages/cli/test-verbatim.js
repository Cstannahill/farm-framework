import Handlebars from "handlebars";

console.log("Testing verbatim helper...");

// Register the verbatim helper
Handlebars.registerHelper("verbatim", (options) => {
  // Handlebars already rendered the inner block once,
  // but all "\{{" sequences are still intact.
  const rendered = options.fn();
  // Replace the protected braces and remove the back-slash.
  return rendered.replace(/\\{{/g, "{{");
});

// Test 1: Basic JSX with escaped braces
console.log("\n=== Test 1: Basic JSX ===");
const template1 = `{{#verbatim}}
<motion.div
  initial=\\{{ opacity: 0, y: -10 }}
  animate=\\{{ opacity: 1, y: 0 }}
>
  Hello {{name}}!
</motion.div>
{{/verbatim}}`;

try {
  const compiled1 = Handlebars.compile(template1);
  const result1 = compiled1({ name: "World" });
  console.log("Result:");
  console.log(result1);
} catch (error) {
  console.log("Error:", error.message);
}

// Test 2: More complex JSX
console.log("\n=== Test 2: Complex JSX ===");
const template2 = `{{#verbatim}}
import React from 'react';
import \\{{ motion }} from 'framer-motion';

export function Component() {
  return (
    <motion.div
      initial=\\{{ opacity: 0 }}
      animate=\\{{ opacity: 1 }}
      className="flex items-center"
    >
      Content here
    </motion.div>
  );
}
{{/verbatim}}`;

try {
  const compiled2 = Handlebars.compile(template2);
  const result2 = compiled2({});
  console.log("Result:");
  console.log(result2);
} catch (error) {
  console.log("Error:", error.message);
}
