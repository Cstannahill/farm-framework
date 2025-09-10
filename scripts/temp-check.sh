#!/bin/bash

echo "Produced files for farmapp..."
npx tree-node-cli "farmapp" 2>/dev/null

echo "Expected files (Basic template)..."
npx tree-node-cli "packages/cli/templates/basic" 2>/dev/null

echo "Expected files (Base template)..."
npx tree-node-cli "packages/cli/templates/base" 2>/dev/null
