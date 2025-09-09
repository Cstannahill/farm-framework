# Security Architecture

## Overview

FARM's security architecture provides comprehensive protection across the AI-first full-stack platform, addressing unique challenges including AI provider security, prompt injection prevention, secure code generation, and cross-stack security consistency. The framework implements defense-in-depth strategies with AI-aware security patterns and secure-by-default configurations.

---

## Multi-Layer Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FARM Security Architecture                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   AI/ML     │  │ Framework   │  │Application  │  │Cross-   │ │
│  │ Security    │  │ Security    │  │ Security    │  │Stack    │ │
│  │(Providers)  │  │(CLI/Codegen)│  │(Auth/Data)  │ │Security │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ Threat      │  │ Secret      │  │ Access      │  │Security │ │
│  │ Detection   │  │ Management  │  │ Control     │  │Monitoring│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ Encryption  │  │ Validation  │  │ Compliance  │  │ Audit   │ │
│  │ & Privacy   │  │ & Sanitization │  │ & Governance│  │ Logging │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Security Components

### 1. AI/ML Security Framework

**Purpose:** Secure AI provider integrations and protect against AI-specific threats

**AI Provider Security Management:**

````python
# packages/farm-security/src/ai_security.py
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import hashlib
import hmac
import json
import re
from datetime import datetime, timedelta

@dataclass
class AISecurityConfig:
    provider: str
    authentication_method: str  # api_key, oauth, local
    rate_limiting: Dict[str, int]
    content_filtering: bool
    audit_logging: bool
    encryption_at_rest: bool
    prompt_injection_protection: bool

class AISecurityManager:
    """Comprehensive AI security management"""

    def __init__(self):
        self.provider_configs = {}
        self.prompt_filters = PromptInjectionFilter()
        self.audit_logger = AIAuditLogger()
        self.rate_limiters = {}

    def configure_provider_security(self, provider: str, config: AISecurityConfig):
        """Configure security settings for an AI provider"""
        self.provider_configs[provider] = config

        # Initialize rate limiter
        if config.rate_limiting:
            self.rate_limiters[provider] = RateLimiter(
                requests_per_minute=config.rate_limiting.get('requests_per_minute', 60),
                tokens_per_minute=config.rate_limiting.get('tokens_per_minute', 40000)
            )

    async def secure_ai_request(self, provider: str, request_data: Dict[str, Any],
                               user_id: Optional[str] = None) -> Dict[str, Any]:
        """Secure and validate AI request before processing"""

        config = self.provider_configs.get(provider)
        if not config:
            raise SecurityError(f"No security configuration for provider {provider}")

        # Rate limiting check
        if provider in self.rate_limiters:
            await self.rate_limiters[provider].check_limits(user_id)

        # Prompt injection protection
        if config.prompt_injection_protection:
            await self.validate_prompt_safety(request_data)

        # Content filtering
        if config.content_filtering:
            await self.apply_content_filters(request_data)

        # Audit logging
        if config.audit_logging:
            await self.audit_logger.log_request(provider, request_data, user_id)

        # Sanitize request data
        sanitized_request = await self.sanitize_request(request_data)

        return sanitized_request

    async def validate_prompt_safety(self, request_data: Dict[str, Any]):
        """Validate prompts against injection attacks"""

        # Extract prompt content from various request formats
        prompt_content = self.extract_prompt_content(request_data)

        # Check for prompt injection patterns
        threats = await self.prompt_filters.detect_threats(prompt_content)

        if threats:
            threat_summary = ", ".join([t['type'] for t in threats])
            raise PromptInjectionError(
                f"Potential prompt injection detected: {threat_summary}",
                threats=threats
            )

    def extract_prompt_content(self, request_data: Dict[str, Any]) -> str:
        """Extract prompt content from request for analysis"""
        content = ""

        # Handle chat messages format
        if 'messages' in request_data:
            for message in request_data['messages']:
                if isinstance(message, dict) and 'content' in message:
                    content += message['content'] + " "

        # Handle direct prompt format
        if 'prompt' in request_data:
            content += request_data['prompt']

        # Handle system prompts
        if 'system_prompt' in request_data:
            content += request_data['system_prompt']

        return content.strip()

    async def apply_content_filters(self, request_data: Dict[str, Any]):
        """Apply content filtering to requests"""

        content = self.extract_prompt_content(request_data)

        # Check for prohibited content
        violations = await self.check_content_policy(content)

        if violations:
            raise ContentPolicyViolation(
                f"Content policy violations detected: {violations}",
                violations=violations
            )

    async def sanitize_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize request data to prevent injection attacks"""

        sanitized = {}

        for key, value in request_data.items():
            if key in ['messages', 'prompt', 'system_prompt']:
                # Sanitize text content
                sanitized[key] = self.sanitize_text_content(value)
            elif key in ['temperature', 'max_tokens', 'top_p']:
                # Validate numeric parameters
                sanitized[key] = self.validate_numeric_parameter(key, value)
            elif key in ['model', 'provider']:
                # Validate identifiers
                sanitized[key] = self.validate_identifier(value)
            else:
                # Pass through other parameters after basic validation
                sanitized[key] = self.sanitize_generic_value(value)

        return sanitized

    def sanitize_text_content(self, content) -> Any:
        """Sanitize text content for AI requests"""

        if isinstance(content, str):
            # Remove potential injection patterns
            content = re.sub(r'<\|.*?\|>', '', content)  # Remove special tokens
            content = re.sub(r'###\s*SYSTEM.*?###', '', content, flags=re.IGNORECASE | re.DOTALL)
            content = re.sub(r'```python.*?```', '', content, flags=re.DOTALL)  # Remove code blocks

            # Limit length to prevent resource exhaustion
            if len(content) > 50000:  # 50KB limit
                content = content[:50000] + "... [truncated for security]"

            return content

        elif isinstance(content, list):
            return [self.sanitize_text_content(item) for item in content]

        elif isinstance(content, dict):
            return {k: self.sanitize_text_content(v) for k, v in content.items()}

        return content

class PromptInjectionFilter:
    """Advanced prompt injection detection and prevention"""

    def __init__(self):
        self.injection_patterns = [
            # Direct instruction injection
            r'(?i)(ignore|forget|disregard)\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)',
            r'(?i)system\s*:\s*you\s+(are|must|should|will)',
            r'(?i)(act|behave|pretend)\s+as\s+(if\s+)?(you\s+are|a)',

            # Role injection
            r'(?i)you\s+are\s+now\s+(a|an|the)',
            r'(?i)(new|different)\s+(role|character|persona|identity)',
            r'(?i)from\s+now\s+on\s+you\s+(are|will|must)',

            # System manipulation
            r'(?i)override\s+(system|safety|security)',
            r'(?i)(disable|turn\s+off|bypass)\s+(safety|security|filtering)',
            r'(?i)developer\s+(mode|access|override)',

            # Data extraction attempts
            r'(?i)(show|display|print|output)\s+(your\s+)?(training|system|internal)',
            r'(?i)(what|how)\s+(are\s+)?your\s+(instructions|guidelines|rules)',
            r'(?i)repeat\s+(your\s+)?(system\s+)?(prompt|instructions)',

            # Code injection
            r'```[\w]*\s*\n.*?```',
            r'<script.*?>.*?</script>',
            r'javascript:.*',

            # Jailbreak attempts
            r'(?i)(jailbreak|dan\s+mode|developer\s+mode)',
            r'(?i)hypothetically|theoretically|imagine\s+if',
            r'(?i)for\s+(educational|research)\s+purposes\s+only'
        ]

        self.compiled_patterns = [re.compile(pattern, re.MULTILINE | re.DOTALL)
                                for pattern in self.injection_patterns]

    async def detect_threats(self, content: str) -> List[Dict[str, Any]]:
        """Detect potential prompt injection threats"""

        threats = []

        for i, pattern in enumerate(self.compiled_patterns):
            matches = pattern.findall(content)
            if matches:
                threats.append({
                    'type': 'prompt_injection',
                    'pattern_id': i,
                    'matches': matches,
                    'risk_level': self.assess_risk_level(i, matches),
                    'description': self.get_threat_description(i)
                })

        # Additional heuristic checks
        if self.check_excessive_instructions(content):
            threats.append({
                'type': 'excessive_instructions',
                'risk_level': 'medium',
                'description': 'Unusually long or complex instructions detected'
            })

        if self.check_system_token_abuse(content):
            threats.append({
                'type': 'system_token_abuse',
                'risk_level': 'high',
                'description': 'Potential system token manipulation detected'
            })

        return threats

    def assess_risk_level(self, pattern_id: int, matches: List) -> str:
        """Assess risk level based on pattern and matches"""

        high_risk_patterns = [0, 1, 2, 6, 7, 8]  # Critical injection patterns
        medium_risk_patterns = [3, 4, 5, 9, 10, 11]  # Moderate injection patterns

        if pattern_id in high_risk_patterns:
            return 'high'
        elif pattern_id in medium_risk_patterns:
            return 'medium'
        else:
            return 'low'

    def check_excessive_instructions(self, content: str) -> bool:
        """Check for unusually complex instruction patterns"""

        instruction_words = ['must', 'should', 'will', 'always', 'never', 'only', 'exactly']
        instruction_count = sum(content.lower().count(word) for word in instruction_words)

        return instruction_count > 10 or len(content) > 10000

    def check_system_token_abuse(self, content: str) -> bool:
        """Check for system token manipulation attempts"""

        system_tokens = ['<|system|>', '<|user|>', '<|assistant|>', '[INST]', '[/INST]']

        return any(token in content for token in system_tokens)

class RateLimiter:
    """AI-aware rate limiting"""

    def __init__(self, requests_per_minute: int, tokens_per_minute: int):
        self.requests_per_minute = requests_per_minute
        self.tokens_per_minute = tokens_per_minute
        self.request_history = {}
        self.token_history = {}

    async def check_limits(self, user_id: Optional[str] = None):
        """Check rate limits for user or global"""

        key = user_id or 'global'
        now = datetime.now()

        # Clean old entries
        self.cleanup_history(key, now)

        # Check request rate limit
        user_requests = self.request_history.get(key, [])
        if len(user_requests) >= self.requests_per_minute:
            raise RateLimitExceeded(
                f"Request rate limit exceeded: {len(user_requests)}/{self.requests_per_minute} per minute"
            )

        # Check token rate limit
        user_tokens = sum(self.token_history.get(key, []))
        if user_tokens >= self.tokens_per_minute:
            raise RateLimitExceeded(
                f"Token rate limit exceeded: {user_tokens}/{self.tokens_per_minute} per minute"
            )

        # Record request
        if key not in self.request_history:
            self.request_history[key] = []
        self.request_history[key].append(now)

    def record_token_usage(self, user_id: Optional[str], token_count: int):
        """Record token usage for rate limiting"""

        key = user_id or 'global'
        now = datetime.now()

        if key not in self.token_history:
            self.token_history[key] = []

        self.token_history[key].append((now, token_count))

    def cleanup_history(self, key: str, now: datetime):
        """Remove entries older than 1 minute"""

        cutoff = now - timedelta(minutes=1)

        if key in self.request_history:
            self.request_history[key] = [
                timestamp for timestamp in self.request_history[key]
                if timestamp > cutoff
            ]

        if key in self.token_history:
            self.token_history[key] = [
                (timestamp, count) for timestamp, count in self.token_history[key]
                if timestamp > cutoff
            ]
````

**Ollama Security Configuration:**

```python
# packages/farm-security/src/ollama_security.py
class OllamaSecurityManager:
    """Security management for local Ollama instances"""

    def __init__(self):
        self.allowed_models = set()
        self.model_access_controls = {}
        self.resource_limits = {}

    def configure_local_security(self, config: Dict[str, Any]):
        """Configure security for local Ollama instance"""

        # Model access controls
        self.allowed_models = set(config.get('allowed_models', []))

        # Resource limits
        self.resource_limits = {
            'max_memory_gb': config.get('max_memory_gb', 8),
            'max_cpu_cores': config.get('max_cpu_cores', 4),
            'max_concurrent_requests': config.get('max_concurrent_requests', 5)
        }

        # Network isolation
        self.network_isolation = config.get('network_isolation', True)

        # Model integrity checking
        self.verify_model_integrity = config.get('verify_model_integrity', True)

    async def validate_model_access(self, model_name: str, user_context: Optional[Dict] = None) -> bool:
        """Validate access to specific model"""

        # Check allowed models list
        if self.allowed_models and model_name not in self.allowed_models:
            raise ModelAccessDenied(f"Model {model_name} not in allowed list")

        # Check model-specific access controls
        if model_name in self.model_access_controls:
            access_rules = self.model_access_controls[model_name]
            if not await self.check_access_rules(access_rules, user_context):
                raise ModelAccessDenied(f"Access denied to model {model_name}")

        # Verify model integrity if enabled
        if self.verify_model_integrity:
            if not await self.verify_model_checksum(model_name):
                raise ModelIntegrityError(f"Model {model_name} failed integrity check")

        return True

    async def verify_model_checksum(self, model_name: str) -> bool:
        """Verify model file integrity"""

        try:
            # Get model info from Ollama
            model_info = await self.get_ollama_model_info(model_name)

            # Verify against known checksums (would be stored securely)
            expected_checksum = await self.get_expected_checksum(model_name)

            if expected_checksum and model_info.get('digest') != expected_checksum:
                return False

            return True

        except Exception as e:
            print(f"Model integrity check failed for {model_name}: {e}")
            return False

    def setup_network_isolation(self):
        """Configure network isolation for Ollama"""

        if self.network_isolation:
            # Configure firewall rules to isolate Ollama
            # Only allow connections from localhost
            firewall_rules = [
                'allow from 127.0.0.1 to any port 11434',
                'deny from any to any port 11434'
            ]

            # Apply firewall rules (implementation specific)
            return self.apply_firewall_rules(firewall_rules)

    def monitor_resource_usage(self):
        """Monitor Ollama resource usage for security"""

        import psutil

        # Find Ollama process
        ollama_processes = [p for p in psutil.process_iter() if 'ollama' in p.name().lower()]

        for process in ollama_processes:
            try:
                # Check memory usage
                memory_gb = process.memory_info().rss / 1024 / 1024 / 1024
                if memory_gb > self.resource_limits['max_memory_gb']:
                    print(f"⚠️ Ollama memory usage ({memory_gb:.1f}GB) exceeds limit")

                # Check CPU usage
                cpu_percent = process.cpu_percent()
                if cpu_percent > 90:  # High CPU usage
                    print(f"⚠️ Ollama high CPU usage: {cpu_percent}%")

            except psutil.NoSuchProcess:
                continue
```

### 2. Framework Security

**Purpose:** Secure CLI operations, code generation, and development workflows

**CLI Security Manager:**

```typescript
// packages/farm-cli/src/security/cli-security.ts
export class CLISecurityManager {
  private allowedCommands: Set<string>;
  private secureTemplates: Map<string, TemplateSecurityConfig>;
  private auditLogger: AuditLogger;

  constructor() {
    this.allowedCommands = new Set([
      'create', 'dev', 'build', 'deploy', 'generate', 'test'
    ]);
    this.secureTemplates = new Map();
    this.auditLogger = new AuditLogger();
  }

  async validateCommand(command: string, args: string[], context: CLIContext): Promise<void> {
    // Command whitelist validation
    if (!this.allowedCommands.has(command)) {
      throw new SecurityError(`Command '${command}' not allowed`);
    }

    // Argument validation
    await this.validateArguments(command, args);

    // Path traversal protection
    await this.validatePaths(args);

    // Template security validation
    if (command === 'create') {
      await this.validateTemplateCreation(args, context);
    }

    // Code generation security
    if (command === 'generate') {
      await this.validateCodeGeneration(args, context);
    }

    // Audit logging
    await this.auditLogger.logCommand(command, args, context);
  }

  async validateArguments(command: string, args: string[]): Promise<void> {
    const patterns = {
      projectName: /^[a-zA-Z0-9-_]+$/,
      templateName: /^[a-zA-Z0-9-_]+$/,
      modelName: /^[a-zA-Z0-9-_]+$/,
      fileName: /^[a-zA-Z0-9-_.\/]+$/
    };

    for (const arg of args) {
      // Check for command injection attempts
      if (this.containsCommandInjection(arg)) {
        throw new SecurityError(`Potential command injection detected in argument: ${arg}`);
      }

      // Check for path traversal attempts
      if (this.containsPathTraversal(arg)) {
        throw new SecurityError(`Path traversal attempt detected: ${arg}`);
      }

      // Validate against known patterns
      if (arg.startsWith('--')) {
        const flagName = arg.replace(/^--/, '').split('=')[0];
        if (!this.isAllowedFlag(command, flagName)) {
          throw new SecurityError(`Flag '${flagName}' not allowed for command '${command}'`);
        }
      }
    }
  }

  containsCommandInjection(input: string): boolean {
    const dangerousPatterns = [
      /[;&|`$(){}[\]<>]/,          // Shell metacharacters
      /\$\(.*\)/,                  // Command substitution
      /`.*`/,                      // Backtick command substitution
      /\|\s*\w+/,                  // Pipe to command
      /&&|\|\|/,                   // Command chaining
      /(rm|del|format|mkfs)\s/,    // Dangerous commands
      /(curl|wget|nc|telnet)\s/    // Network commands
    ];

    return dangerousPatterns.some(pattern => pattern.test(input));
  }

  containsPathTraversal(input: string): boolean {
    const traversalPatterns = [
      /\.\.\//,                    // Directory traversal
      /\.\.\\\/,                   // Windows directory traversal
      /\/etc\/passwd/,             // Unix system files
      /\/proc\//,                  // Linux proc filesystem
      /C:\\Windows\\/,             // Windows system directory
      /%2e%2e%2f/i,               // URL encoded traversal
      /\.\.%2f/i                   // Mixed encoding
    ];

    return traversalPatterns.some(pattern => pattern.test(input));
  }

  async validateTemplateCreation(args: string[], context: CLIContext): Promise<void> {
    const templateArg = args.find(arg => arg.startsWith('--template='));
    const template = templateArg?.split('=')[1] || 'basic';

    // Validate template source
    if (template.startsWith('http://') || template.startsWith('https://')) {
      await this.validateRemoteTemplate(template);
    } else if (template.includes('/') || template.includes('\\')) {
      await this.validateLocalTemplate(template);
    } else {
      await this.validateBuiltInTemplate(template);
    }

    // Check template security configuration
    const securityConfig = this.secureTemplates.get(template);
    if (securityConfig) {
      await this.enforceTemplateSecurityPolicy(securityConfig, context);
    }
  }

  async validateRemoteTemplate(templateUrl: string): Promise<void> {
    const url = new URL(templateUrl);

    // Only allow HTTPS for remote templates
    if (url.protocol !== 'https:') {
      throw new SecurityError('Remote templates must use HTTPS');
    }

    // Whitelist allowed domains
    const allowedDomains = [
      'github.com',
      'raw.githubusercontent.com',
      'gitlab.com',
      'bitbucket.org'
    ];

    if (!allowedDomains.includes(url.hostname)) {
      throw new SecurityError(`Template domain '${url.hostname}' not allowed`);
    }

    // Validate template content before downloading
    await this.validateRemoteTemplateContent(templateUrl);
  }

  async validateCodeGeneration(args: string[], context: CLIContext): Promise<void> {
    const generateType = args[0]; // model, route, component, etc.
    const entityName = args[1];

    // Validate generation type
    const allowedTypes = ['model', 'route', 'component', 'page', 'api'];
    if (!allowedTypes.includes(generateType)) {
      throw new SecurityError(`Code generation type '${generateType}' not allowed`);
    }

    // Validate entity name
    if (!this.isValidIdentifier(entityName)) {
      throw new SecurityError(`Invalid entity name: ${entityName}`);
    }

    // Check for template injection in additional arguments
    const additionalArgs = args.slice(2);
    for (const arg of additionalArgs) {
      if (this.containsTemplateInjection(arg)) {
        throw new SecurityError(`Template injection detected in argument: ${arg}`);
      }
    }
  }

  containsTemplateInjection(input: string): boolean {
    const injectionPatterns = [
      /\{\{.*eval.*\}\}/,          // Template eval injection
      /\{\{.*require.*\}\}/,       // Node.js require injection
      /\{\{.*process.*\}\}/,       // Process access
      /\{\{.*fs\..*\}\}/,          // Filesystem access
      /<%.*%>/,                    // ERB/EJS injection
      /\$\{.*\}/,                  // Template literal injection
      /__import__/,                // Python import injection
      /exec\(/,                    // Code execution
      /eval\(/                     // Eval injection
    ];

    return injectionPatterns.some(pattern => pattern.test(input));
  }

  isValidIdentifier(name: string): boolean {
    // Must be valid programming identifier
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && name.length <= 100;
  }
}
```

**Code Generation Security:**

```typescript
// tools/codegen/security/generation-security.ts
export class CodeGenerationSecurity {
  private sanitizer: CodeSanitizer;
  private validator: CodeValidator;
  private auditLogger: CodeGenAuditLogger;

  constructor() {
    this.sanitizer = new CodeSanitizer();
    this.validator = new CodeValidator();
    this.auditLogger = new CodeGenAuditLogger();
  }

  async secureGeneration(
    generationType: string,
    sourceData: any,
    template: string,
    outputPath: string
  ): Promise<GenerationResult> {
    // Validate generation parameters
    await this.validateGenerationParameters(
      generationType,
      sourceData,
      outputPath
    );

    // Sanitize source data
    const sanitizedData = await this.sanitizer.sanitizeSourceData(sourceData);

    // Validate template security
    await this.validateTemplate(template);

    // Generate code with security context
    const generatedCode = await this.generateSecureCode(
      generationType,
      sanitizedData,
      template
    );

    // Validate generated code
    await this.validator.validateGeneratedCode(generatedCode, generationType);

    // Audit the generation
    await this.auditLogger.logGeneration({
      type: generationType,
      sourceData: sanitizedData,
      outputPath,
      generatedLinesCount: generatedCode.split("\n").length,
      timestamp: new Date(),
    });

    return {
      code: generatedCode,
      metadata: {
        generated: true,
        secure: true,
        sanitized: true,
        validated: true,
      },
    };
  }

  async validateTemplate(template: string): Promise<void> {
    // Check for dangerous template constructs
    const dangerousPatterns = [
      /require\(['"]fs['"]\)/, // File system access
      /require\(['"]child_process['"]\)/, // Process spawning
      /require\(['"]os['"]\)/, // OS access
      /eval\(/, // Code evaluation
      /Function\(/, // Dynamic function creation
      /process\./, // Process access
      /global\./, // Global object access
      /__dirname|__filename/, // File path access
      /import\s+.*\s+from\s+['"]node:/, // Node.js built-in imports
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(template)) {
        throw new TemplateSecurityError(
          `Dangerous pattern detected in template: ${pattern.source}`
        );
      }
    }

    // Validate template syntax and structure
    await this.validateTemplateSyntax(template);
  }

  async validateGeneratedCode(code: string, type: string): Promise<void> {
    // Check for injection vulnerabilities in generated code
    const securityChecks = {
      typescript: [
        /eval\(/, // Eval usage
        /Function\(/, // Dynamic function creation
        /document\.write/, // XSS vector
        /innerHTML\s*=.*\+/, // XSS via concatenation
        /dangerouslySetInnerHTML/, // React XSS vector
        /window\[.*\]/, // Dynamic property access
        /localStorage\.setItem.*\+/, // Storage injection
      ],
      python: [
        /exec\(/, // Code execution
        /eval\(/, // Expression evaluation
        /compile\(/, // Code compilation
        /__import__\(/, // Dynamic imports
        /getattr\(/, // Dynamic attribute access
        /setattr\(/, // Dynamic attribute setting
        /pickle\.loads/, // Deserialization
        /subprocess\./, // Process spawning
        /os\.system/, // System command execution
      ],
    };

    const checks = securityChecks[type as keyof typeof securityChecks] || [];

    for (const pattern of checks) {
      if (pattern.test(code)) {
        throw new GeneratedCodeSecurityError(
          `Security violation in generated ${type} code: ${pattern.source}`
        );
      }
    }

    // Additional context-specific validation
    if (type === "api") {
      await this.validateAPISecurityPatterns(code);
    } else if (type === "component") {
      await this.validateComponentSecurityPatterns(code);
    }
  }

  async validateAPISecurityPatterns(code: string): Promise<void> {
    const apiSecurityPatterns = [
      // Missing authentication checks
      {
        pattern:
          /@app\.(get|post|put|delete)\(.*\)\s*\n\s*async\s+def\s+\w+\([^)]*\):\s*\n(?!\s*#.*auth|\s*if.*auth|\s*@.*auth)/,
        message: "API endpoint missing authentication check",
      },
      // SQL injection vulnerability
      {
        pattern: /\.execute\s*\(\s*f?["'].*\{.*\}.*["']/,
        message: "Potential SQL injection vulnerability",
      },
      // Missing input validation
      {
        pattern:
          /def\s+\w+\([^)]*request[^)]*\):\s*\n(?!\s*#.*valid|\s*if.*valid|\s*request\.)/,
        message: "API endpoint missing input validation",
      },
    ];

    for (const check of apiSecurityPatterns) {
      if (check.pattern.test(code)) {
        throw new APISecurityError(check.message);
      }
    }
  }
}
```

### 3. Application Security Framework

**Purpose:** Provide secure authentication, authorization, and data protection

**Integrated Authentication System:**

```python
# packages/farm-auth/src/auth_security.py
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
import jwt
import bcrypt
import secrets
from dataclasses import dataclass

@dataclass
class SecurityConfig:
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    password_min_length: int = 8
    password_require_special: bool = True
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    mfa_enabled: bool = False
    session_security: bool = True

class FarmSecurityManager:
    """Comprehensive security management for FARM applications"""

    def __init__(self, config: SecurityConfig):
        self.config = config
        self.login_attempts = {}  # Track failed login attempts
        self.active_sessions = {}  # Track active sessions
        self.password_validator = PasswordValidator(config)
        self.token_manager = TokenManager(config)
        self.audit_logger = SecurityAuditLogger()

    async def authenticate_user(self, email: str, password: str,
                               ip_address: str, user_agent: str) -> Dict[str, Any]:
        """Secure user authentication with comprehensive security checks"""

        # Check for account lockout
        if await self.is_account_locked(email, ip_address):
            raise AccountLockedError("Account temporarily locked due to failed login attempts")

        try:
            # Validate credentials
            user = await self.validate_credentials(email, password)

            if not user:
                await self.record_failed_login(email, ip_address)
                raise AuthenticationError("Invalid credentials")

            # Additional security checks
            await self.check_account_security(user, ip_address, user_agent)

            # Generate secure tokens
            tokens = await self.token_manager.generate_tokens(user)

            # Create secure session
            session = await self.create_secure_session(user, tokens, ip_address, user_agent)

            # Clear failed login attempts
            await self.clear_failed_login_attempts(email, ip_address)

            # Audit successful login
            await self.audit_logger.log_successful_login(user, ip_address, user_agent)

            return {
                "user": self.sanitize_user_data(user),
                "access_token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"],
                "session_id": session["session_id"],
                "expires_in": self.config.access_token_expire_minutes * 60
            }

        except Exception as e:
            await self.audit_logger.log_failed_login(email, ip_address, str(e))
            raise

    async def validate_credentials(self, email: str, password: str) -> Optional[Dict]:
        """Secure credential validation"""

        # Get user from database (timing attack protection)
        user = await self.get_user_by_email(email)

        # Always perform password check to prevent timing attacks
        if user:
            password_valid = bcrypt.checkpw(
                password.encode('utf-8'),
                user['password_hash'].encode('utf-8')
            )

            if password_valid and user.get('active', True):
                return user
        else:
            # Perform dummy bcrypt operation to prevent timing attacks
            bcrypt.checkpw(b'dummy', b'$2b$12$dummy.hash.to.prevent.timing.attacks')

        return None

    async def check_account_security(self, user: Dict, ip_address: str, user_agent: str):
        """Additional security checks for user account"""

        # Check for suspicious login patterns
        if await self.detect_suspicious_login(user, ip_address, user_agent):
            # Could implement additional verification here
            await self.audit_logger.log_suspicious_login(user, ip_address, user_agent)

        # Check if account requires password change
        if self.requires_password_change(user):
            raise PasswordChangeRequiredError("Password change required")

        # Check account status
        if not user.get('active', True):
            raise AccountDisabledError("Account is disabled")

        if user.get('locked', False):
            raise AccountLockedError("Account is locked")

    async def authorize_action(self, user_id: str, action: str, resource: str,
                              context: Optional[Dict] = None) -> bool:
        """Comprehensive authorization system"""

        user = await self.get_user_by_id(user_id)
        if not user:
            return False

        # Check role-based permissions
        user_roles = user.get('roles', [])

        # Check direct permissions
        if await self.check_direct_permissions(user_roles, action, resource):
            return True

        # Check resource-specific permissions
        if await self.check_resource_permissions(user_id, action, resource, context):
            return True

        # Check conditional permissions
        if await self.check_conditional_permissions(user, action, resource, context):
            return True

        # Audit authorization failure
        await self.audit_logger.log_authorization_failure(
            user_id, action, resource, context
        )

        return False

    async def secure_ai_request_authorization(self, user_id: str, provider: str,
                                            model: str, request_data: Dict) -> bool:
        """AI-specific authorization checks"""

        # Check if user can access AI features
        if not await self.authorize_action(user_id, 'use', 'ai_services'):
            return False

        # Check provider-specific permissions
        if not await self.authorize_action(user_id, 'use', f'ai_provider:{provider}'):
            return False

        # Check model-specific permissions
        if not await self.authorize_action(user_id, 'use', f'ai_model:{model}'):
            return False

        # Check request content
        if await self.contains_restricted_content(request_data):
            await self.audit_logger.log_restricted_content_attempt(user_id, request_data)
            return False

        # Check rate limits
        if not await self.check_ai_rate_limits(user_id, provider):
            return False

        return True

class PasswordValidator:
    """Secure password validation and policy enforcement"""

    def __init__(self, config: SecurityConfig):
        self.config = config
        self.common_passwords = self.load_common_passwords()

    def validate_password(self, password: str, user_data: Optional[Dict] = None) -> Dict[str, Any]:
        """Comprehensive password validation"""

        issues = []
        score = 0

        # Length check
        if len(password) < self.config.password_min_length:
            issues.append(f"Password must be at least {self.config.password_min_length} characters")
        else:
            score += 1

        # Complexity checks
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)

        if not has_upper:
            issues.append("Password must contain uppercase letters")
        else:
            score += 1

        if not has_lower:
            issues.append("Password must contain lowercase letters")
        else:
            score += 1

        if not has_digit:
            issues.append("Password must contain numbers")
        else:
            score += 1

        if self.config.password_require_special and not has_special:
            issues.append("Password must contain special characters")
        elif has_special:
            score += 1

        # Common password check
        if password.lower() in self.common_passwords:
            issues.append("Password is too common")
        else:
            score += 1

        # Personal information check
        if user_data and self.contains_personal_info(password, user_data):
            issues.append("Password cannot contain personal information")
        else:
            score += 1

        # Repetition check
        if self.has_excessive_repetition(password):
            issues.append("Password has too much repetition")
        else:
            score += 1

        strength = self.calculate_strength(score, len(issues))

        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "strength": strength,
            "score": score
        }

    def calculate_strength(self, score: int, issue_count: int) -> str:
        """Calculate password strength rating"""

        if issue_count > 0:
            return "weak"
        elif score >= 7:
            return "strong"
        elif score >= 5:
            return "medium"
        else:
            return "weak"
```

### 4. Data Protection & Privacy

**Purpose:** Secure data handling, encryption, and privacy compliance

**Data Security Manager:**

```python
# packages/farm-security/src/data_security.py
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os
from typing import Dict, Any, Optional, List

class DataSecurityManager:
    """Comprehensive data security and encryption management"""

    def __init__(self):
        self.encryption_key = self.get_or_create_encryption_key()
        self.fernet = Fernet(self.encryption_key)
        self.pii_detector = PIIDetector()
        self.data_classifier = DataClassifier()

    def get_or_create_encryption_key(self) -> bytes:
        """Get or create encryption key for data at rest"""

        key_file = os.path.join(os.getcwd(), '.farm', 'encryption.key')

        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            # Generate new key
            key = Fernet.generate_key()

            # Ensure directory exists
            os.makedirs(os.path.dirname(key_file), exist_ok=True)

            # Save key securely
            with open(key_file, 'wb') as f:
                f.write(key)

            # Set restrictive permissions
            os.chmod(key_file, 0o600)

            return key

    def encrypt_sensitive_data(self, data: Any, data_type: str = 'general') -> str:
        """Encrypt sensitive data with appropriate method"""

        # Serialize data
        if isinstance(data, dict):
            data_str = json.dumps(data)
        else:
            data_str = str(data)

        # Encrypt data
        encrypted_data = self.fernet.encrypt(data_str.encode())

        # Return base64 encoded for storage
        return base64.b64encode(encrypted_data).decode()

    def decrypt_sensitive_data(self, encrypted_data: str, expected_type: type = str) -> Any:
        """Decrypt sensitive data"""

        try:
            # Decode from base64
            encrypted_bytes = base64.b64decode(encrypted_data.encode())

            # Decrypt data
            decrypted_bytes = self.fernet.decrypt(encrypted_bytes)
            decrypted_str = decrypted_bytes.decode()

            # Deserialize if needed
            if expected_type == dict:
                return json.loads(decrypted_str)
            elif expected_type == int:
                return int(decrypted_str)
            elif expected_type == float:
                return float(decrypted_str)
            else:
                return decrypted_str

        except Exception as e:
            raise DecryptionError(f"Failed to decrypt data: {e}")

    async def secure_ai_conversation_storage(self, conversation_data: Dict[str, Any],
                                           user_id: str) -> Dict[str, Any]:
        """Securely store AI conversation data with PII protection"""

        # Detect and classify PII in conversation
        pii_analysis = await self.pii_detector.analyze_conversation(conversation_data)

        # Apply data protection based on classification
        protected_data = await self.apply_data_protection(conversation_data, pii_analysis)

        # Encrypt sensitive parts
        if pii_analysis['contains_pii']:
            protected_data['messages'] = self.encrypt_sensitive_data(
                protected_data['messages'], 'pii'
            )

        # Add metadata for compliance
        protected_data['_security'] = {
            'encrypted': pii_analysis['contains_pii'],
            'pii_detected': pii_analysis['pii_types'],
            'classification': pii_analysis['classification'],
            'retention_policy': self.get_retention_policy(pii_analysis['classification']),
            'user_id_hash': self.hash_user_id(user_id)
        }

        return protected_data

    async def apply_data_protection(self, data: Dict[str, Any],
                                  pii_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Apply appropriate data protection measures"""

        protected_data = data.copy()

        # Redact or mask PII based on type
        for pii_type in pii_analysis['pii_types']:
            if pii_type == 'email':
                protected_data = self.mask_emails(protected_data)
            elif pii_type == 'phone':
                protected_data = self.mask_phone_numbers(protected_data)
            elif pii_type == 'ssn':
                protected_data = self.mask_ssn(protected_data)
            elif pii_type == 'credit_card':
                protected_data = self.mask_credit_cards(protected_data)
            elif pii_type == 'name':
                protected_data = self.mask_names(protected_data)

        return protected_data

    def get_retention_policy(self, classification: str) -> Dict[str, Any]:
        """Get data retention policy based on classification"""

        policies = {
            'public': {'retention_days': 365, 'auto_delete': False},
            'internal': {'retention_days': 180, 'auto_delete': True},
            'confidential': {'retention_days': 90, 'auto_delete': True},
            'restricted': {'retention_days': 30, 'auto_delete': True}
        }

        return policies.get(classification, policies['restricted'])

class PIIDetector:
    """Advanced PII detection for AI conversations"""

    def __init__(self):
        self.patterns = {
            'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'phone': r'\b(?:\+1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b',
            'ssn': r'\b\d{3}-?\d{2}-?\d{4}\b',
            'credit_card': r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b',
            'name': r'\b[A-Z][a-z]+ [A-Z][a-z]+\b',  # Simple name pattern
            'address': r'\b\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Way|Court|Ct)\b'
        }

        self.compiled_patterns = {
            name: re.compile(pattern, re.IGNORECASE)
            for name, pattern in self.patterns.items()
        }

    async def analyze_conversation(self, conversation: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze conversation for PII and classify data sensitivity"""

        # Extract text content from conversation
        text_content = self.extract_text_content(conversation)

        # Detect PII types
        pii_types = []
        pii_locations = {}

        for pii_type, pattern in self.compiled_patterns.items():
            matches = pattern.findall(text_content)
            if matches:
                pii_types.append(pii_type)
                pii_locations[pii_type] = matches

        # Classify data sensitivity
        classification = self.classify_data_sensitivity(pii_types)

        return {
            'contains_pii': len(pii_types) > 0,
            'pii_types': pii_types,
            'pii_locations': pii_locations,
            'classification': classification,
            'risk_level': self.assess_risk_level(pii_types)
        }

    def extract_text_content(self, conversation: Dict[str, Any]) -> str:
        """Extract all text content from conversation"""

        content = ""

        if 'messages' in conversation:
            for message in conversation['messages']:
                if isinstance(message, dict) and 'content' in message:
                    content += message['content'] + " "

        if 'system_prompt' in conversation:
            content += conversation['system_prompt'] + " "

        return content

    def classify_data_sensitivity(self, pii_types: List[str]) -> str:
        """Classify data sensitivity based on PII types detected"""

        high_sensitivity = ['ssn', 'credit_card', 'medical']
        medium_sensitivity = ['email', 'phone', 'address']
        low_sensitivity = ['name']

        if any(pii_type in high_sensitivity for pii_type in pii_types):
            return 'restricted'
        elif any(pii_type in medium_sensitivity for pii_type in pii_types):
            return 'confidential'
        elif any(pii_type in low_sensitivity for pii_type in pii_types):
            return 'internal'
        else:
            return 'public'
```

---

## Security CLI Integration

### Security Commands

**Comprehensive Security CLI:**

```bash
# Security management commands
farm security                          # Security dashboard and status
farm security:scan                     # Run security scans
farm security:audit                    # Security audit report
farm security:config                   # Security configuration wizard

# Secret management
farm secrets                           # List managed secrets
farm secrets:add <name>               # Add new secret
farm secrets:rotate <name>            # Rotate secret
farm secrets:validate                 # Validate all secrets

# AI security
farm security:ai                      # AI-specific security audit
farm security:ai:scan                 # Scan for AI vulnerabilities
farm security:ai:prompt-test          # Test prompt injection defenses

# Code security
farm security:code                    # Code security analysis
farm security:deps                    # Dependency vulnerability scan
farm security:generate               # Security-focused code generation

# Compliance and reporting
farm security:report                  # Generate security report
farm security:compliance             # Compliance check
farm security:export                 # Export security data
```

### Security Configuration

**Farm Config Security Settings:**

```typescript
// farm.config.ts - Security configuration
export default defineConfig({
  security: {
    // AI security settings
    ai: {
      promptInjectionProtection: true,
      contentFiltering: true,
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 60,
        tokensPerMinute: 40000
      },
      auditLogging: true,
      modelAccessControl: {
        allowedModels: ['llama3.1', 'gpt-3.5-turbo'],
        userPermissions: true
      }
    },

    // Authentication and authorization
    auth: {
      jwtSecretKey: process.env.JWT_SECRET_KEY,
      accessTokenExpire: 30, // minutes
      refreshTokenExpire: 7,  // days
      passwordPolicy: {
        minLength: 8,
        requireSpecialChars: true,
        maxLoginAttempts: 5,
        lockoutDuration: 15 // minutes
      },
      mfa: {
        enabled: false,
        methods: ['totp', 'sms']
      }
    },

    // Data protection
    data: {
      encryptionAtRest: true,
      piiDetection: true,
      dataClassification: true,
      retentionPolicies: {
        logs: '90d',
        aiConversations: '30d',
        userData: '2y'
      }
    },

    // Code and framework security
    framework: {
      cliSecurity: true,
      templateValidation: true,
      codeGenerationSecurity: true,
      dependencyScanning: true,
      secretScanning: true
    },

    // Production security
    production: {
      httpsEnforcement: true,
      securityHeaders: true,
      rateLimiting: true,
      auditLogging: true,
      intrusion Detection: true
    },

    // Compliance
    compliance: {
      gdpr: true,
      ccpa: true,
      hipaa: false,
      soc2: false
    }
  }
});
```

---

## Security Monitoring & Alerts

### Real-Time Security Dashboard

```typescript
// packages/farm-security/src/dashboard.tsx
export function SecurityDashboard() {
  const [securityMetrics, setSecurityMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [threats, setThreats] = useState([]);

  return (
    <div className="security-dashboard p-6 space-y-6">
      {/* Security Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SecurityMetricCard
          title="AI Security"
          status={securityMetrics?.ai?.status || "unknown"}
          details={[
            `Prompt injections blocked: ${
              securityMetrics?.ai?.blockedInjections || 0
            }`,
            `Rate limit violations: ${
              securityMetrics?.ai?.rateLimitViolations || 0
            }`,
            `Active models: ${securityMetrics?.ai?.activeModels || 0}`,
          ]}
        />

        <SecurityMetricCard
          title="Authentication"
          status={securityMetrics?.auth?.status || "unknown"}
          details={[
            `Failed logins: ${securityMetrics?.auth?.failedLogins || 0}`,
            `Locked accounts: ${securityMetrics?.auth?.lockedAccounts || 0}`,
            `Active sessions: ${securityMetrics?.auth?.activeSessions || 0}`,
          ]}
        />

        <SecurityMetricCard
          title="Data Protection"
          status={securityMetrics?.data?.status || "unknown"}
          details={[
            `PII detections: ${securityMetrics?.data?.piiDetections || 0}`,
            `Encrypted records: ${
              securityMetrics?.data?.encryptedRecords || 0
            }`,
            `Policy violations: ${
              securityMetrics?.data?.policyViolations || 0
            }`,
          ]}
        />

        <SecurityMetricCard
          title="Code Security"
          status={securityMetrics?.code?.status || "unknown"}
          details={[
            `Vulnerabilities: ${securityMetrics?.code?.vulnerabilities || 0}`,
            `Secrets exposed: ${securityMetrics?.code?.exposedSecrets || 0}`,
            `Security scans: ${securityMetrics?.code?.scansToday || 0}`,
          ]}
        />
      </div>

      {/* Recent Security Alerts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Security Alerts</h3>
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <SecurityAlert key={index} alert={alert} />
          ))}
        </div>
      </div>

      {/* Threat Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Threat Analysis</h3>
        <ThreatAnalysisChart threats={threats} />
      </div>
    </div>
  );
}
```

---

**🎉 Phase 3 Complete!**

We've successfully completed all Phase 3 architectural sketches:

```md
### Phase 3: Production & Deployment ✅ COMPLETED

- [x] **Deployment Pipeline Structure**
- [x] **Testing Strategy Architecture**
- [x] **Performance & Monitoring Design**
- [x] **Security Architecture** ✅ JUST COMPLETED
```

The Security Architecture provides comprehensive protection for FARM's unique AI-first challenges:

### 🔒 **Key Security Innovations:**

- **AI-Specific Security**: Prompt injection protection, AI provider security, model access controls
- **Cross-Stack Security**: Consistent security patterns between Python and TypeScript
- **Framework Security**: CLI security, secure code generation, template validation
- **Production Ready**: Authentication, authorization, data protection, compliance
- **Real-time Monitoring**: Security dashboards, threat detection, automated alerts

### 🏗️ **Complete Architectural Foundation:**

With all **12 architectural sketches** completed, FARM now has a comprehensive technical foundation covering:

- Core framework architecture and development experience
- AI/ML integration with local and cloud providers
- Production deployment, testing, performance, and security
- Plugin system and community ecosystem

**Ready for implementation phase!** 🚀
