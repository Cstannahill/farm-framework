#!/usr/bin/env node

import fs from "fs";
import path from "path";

/**
 * Fix handlebars templates by removing verbatim blocks and properly escaping JSX braces
 * Only targets the specific files that are causing template processing errors
 */
async function fixTemplates() {
  // Only target the specific files that failed during project generation
  const problematicFiles = [
    "templates/ai-chat/apps/web/src/App.tsx.hbs",
    "templates/ai-chat/apps/web/src/components/ai/ProviderStatus.tsx.hbs",
    "templates/ai-chat/apps/web/src/components/chat/ChatWindow.tsx.hbs",
    "templates/ai-chat/apps/web/src/components/chat/MessageBubble.tsx.hbs",
    "templates/ai-chat/apps/web/src/components/chat/MessageInput.tsx.hbs",
    "templates/ai-chat/apps/web/src/components/chat/TypingIndicator.tsx.hbs",
    "templates/ai-chat/apps/web/src/components/layout/Header.tsx.hbs",
    "templates/ai-chat/apps/web/src/components/layout/Sidebar.tsx.hbs",
    "templates/ai-chat/apps/web/src/components/ui/button.tsx.hbs",
    "templates/ai-chat/apps/web/src/utils/markdown.ts.hbs",
  ];

  console.log(`Fixing ${problematicFiles.length} problematic template files:`);

  for (const filePath of problematicFiles) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      continue;
    }

    console.log(`Processing: ${filePath}`);

    let content = fs.readFileSync(filePath, "utf-8");

    // Remove malformed verbatim syntax
    content = content.replace(/\{\{\{\{\/verbatim\}\}\}\}/g, "");
    content = content.replace(/\{\{\{\{\/verbatm\}\}\}\}/g, ""); // Handle typo

    // Remove correct verbatim blocks
    content = content.replace(/\{\{#verbatim\}\}\n?/g, "");
    content = content.replace(/\n?\{\{\/verbatim\}\}/g, "");

    // Fix curly brace escaping - use HTML entities instead of backslashes
    content = content.replace(/\\{/g, "&#123;");
    content = content.replace(/\\}/g, "&#125;");

    // Fix template variable references to use proper handlebars syntax
    content = content.replace(/\{\{project_name\}\}/g, "{{projectName}}");

    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }

  console.log("\n✅ All templates fixed!");
}

fixTemplates().catch(console.error);
