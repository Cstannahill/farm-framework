# Run all template validations

farm validate

# Validate specific template

farm validate --template ai-chat

# Validate specific configuration

farm validate --template ai-chat --config ollama-only

# Skip AI provider tests (for CI environments without GPU)

farm validate --skip-ai

# Test AI provider connectivity

farm validate:providers

# Test specific provider

farm validate:providers --provider ollama

# Run performance benchmarks

farm validate:performance

# Generate compatibility report

farm validate:compatibility

# Validate against specific environments

farm validate --env development
farm validate --env production
