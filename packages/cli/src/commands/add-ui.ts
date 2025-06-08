import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { PackageInstaller } from '../utils/package-installer.js';
import { logger } from '../utils/logger.js';

interface AddUIOptions {
  verbose?: boolean;
  dryRun?: boolean;
}

export function createAddUICommand(): Command {
  const addCmd = new Command('add');
  const uiCmd = new Command('ui');
  const assistantCmd = new Command('assistant');
  assistantCmd
    .alias('chat')
    .description('Add Assistant UI integration')
    .option('--dry-run', 'Run without writing files')
    .option('-v, --verbose', 'Verbose output')
    .action(async (options: AddUIOptions) => {
      await addAssistantUI(options);
    });

  uiCmd.addCommand(assistantCmd);
  addCmd.addCommand(uiCmd);
  return addCmd;
}

async function addAssistantUI(options: AddUIOptions): Promise<void> {
  try {
    const projectRoot = process.cwd();
    const packages = [
      '@assistant-ui/react',
      '@assistant-ui/react-tailwind',
      '@assistant-ui/react-markdown',
      'remark-gfm',
    ];

    const installer = new PackageInstaller();
    for (const pkg of packages) {
      const installed = await installer.getInstalledVersion(projectRoot, pkg);
      if (installed) {
        logger.info(`📦 ${pkg} already installed (v${installed})`);
        continue;
      }
      if (!options.dryRun) {
        await installer.addDependency(projectRoot, pkg);
      }
      logger.success(`Installed ${pkg}`);
    }

    const tailwindPath = path.join(projectRoot, 'apps/web/tailwind.config.ts');
    await ensureTailwindPlugin(tailwindPath, options.dryRun);

    await generateFile(
      path.join(projectRoot, 'apps/web/src/providers/AssistantProvider.tsx'),
      providerTemplate,
      options.dryRun,
    );
    await generateFile(
      path.join(projectRoot, 'apps/web/src/hooks/useFarmAssistant.ts'),
      hookTemplate,
      options.dryRun,
    );
    await generateFile(
      path.join(projectRoot, 'apps/web/src/pages/AssistantChat.tsx'),
      pageTemplate,
      options.dryRun,
    );

    await generateFile(
      path.join(projectRoot, 'apps/web/src/api/assistant.ts'),
      proxyTemplate,
      options.dryRun,
    );

    logger.success('Assistant UI added');
  } catch (error) {
    logger.error('Failed to add Assistant UI:', error);
    process.exit(1);
  }
}

async function ensureTailwindPlugin(filePath: string, dryRun = false) {
  let content = '';
  if (await fs.pathExists(filePath)) {
    content = await fs.readFile(filePath, 'utf8');
  } else {
    content = `import { defineConfig } from 'tailwindcss/helpers';\n\nexport default defineConfig({\n  content: ['./index.html', './src/**/*.{ts,tsx}'],\n  theme: { extend: {} },\n  plugins: [],\n});\n`;
  }

  if (!content.includes("'@assistant-ui/react-tailwind'") && !content.includes('"@assistant-ui/react-tailwind"')) {
    content = content.replace(/plugins:\s*\[/, match => `${match}\n    require('@assistant-ui/react-tailwind'),`);
  }

  if (!dryRun) {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
  }
  logger.success(`Updated ${path.relative(process.cwd(), filePath)}`);
}

async function generateFile(filePath: string, tpl: string, dryRun = false) {
  if (await fs.pathExists(filePath)) {
    logger.info(`Skipping existing ${path.relative(process.cwd(), filePath)}`);
    return;
  }
  if (!dryRun) {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, tpl);
  }
  logger.success(`Created ${path.relative(process.cwd(), filePath)}`);
}

const providerTemplate = `import { AssistantRuntimeProvider } from '@assistant-ui/react';
import type { ReactNode } from 'react';
import { useFarmAssistantRuntime } from '../hooks/useFarmAssistant';

export function AssistantProvider({ children }: { children: ReactNode }) {
  const runtime = useFarmAssistantRuntime();
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
`;

const hookTemplate = `import { useLocalRuntime } from '@assistant-ui/react';
import { useAIChat } from '@farm/ai-hooks';

export function useFarmAssistantRuntime() {
  const farmChat = useAIChat();
  return useLocalRuntime({
    async onNew(message) {
      const response = await farmChat.mutateAsync({
        messages: [{ role: 'user', content: message.content }],
      });
      return {
        id: response.id ?? Date.now().toString(),
        role: 'assistant',
        content: [{ type: 'text', text: response.content }],
      };
    },
  });
}
`;

const pageTemplate = `import { Thread } from '@assistant-ui/react';
import { makeMarkdownText } from '@assistant-ui/react-markdown';

const MarkdownText = makeMarkdownText();

export default function AssistantChat() {
  return (
    <div className='h-screen flex flex-col bg-background'>
      <Thread assistantMessage={{ components: { Text: MarkdownText } }} className='flex-1' />
    </div>
  );
}
`;

const proxyTemplate = `import { createProxyMiddleware } from 'http-proxy-middleware';
export default createProxyMiddleware('/api/assistant', {
  target: 'http://localhost:8000/chat',
  changeOrigin: true,
});
`;

