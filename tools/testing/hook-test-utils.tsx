// tools/testing/hook-test-utils.tsx
import React, { ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

// Mock API client for testing
export const createMockApiClient = () => ({
  users: {
    list: vi.fn(),
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  ai: {
    chat: vi.fn(),
    chatStream: vi.fn(),
    listModels: vi.fn(),
    healthCheck: vi.fn(),
    loadModel: vi.fn(),
  },
});

// Test query client with no retries and immediate garbage collection
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Test wrapper component
interface TestWrapperProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

export function TestWrapper({ children, queryClient }: TestWrapperProps) {
  const testClient = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={testClient}>{children}</QueryClientProvider>
  );
}

// Custom render function with query client
export function renderWithQueryClient(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { queryClient?: QueryClient }
) {
  const { queryClient, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    ),
    ...renderOptions,
  });
}

// Hook testing utilities
export async function waitForHookToSettle() {
  // Wait for next tick to allow hooks to settle
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// Mock EventSource for testing streaming hooks
export class MockEventSource {
  private listeners: Record<string, ((event: any) => void)[]> = {};
  private readyState = EventSource.CONNECTING;

  constructor(public url: string) {
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = EventSource.OPEN;
      this.dispatchEvent("open", {});
    }, 0);
  }

  addEventListener(type: string, listener: (event: any) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }
  }

  close() {
    this.readyState = EventSource.CLOSED;
    this.dispatchEvent("close", {});
  }

  // Test helpers
  simulateMessage(data: string) {
    this.dispatchEvent("message", { data });
  }

  simulateError(error?: any) {
    this.dispatchEvent("error", error || new Error("EventSource error"));
  }

  private dispatchEvent(type: string, event: any) {
    if (this.listeners[type]) {
      this.listeners[type].forEach((listener) => listener(event));
    }
  }

  // EventSource properties
  get readyState() {
    return this.readyState;
  }

  // Event handler properties
  onopen: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
}

// Example test for generated hooks
export const HOOK_TEST_TEMPLATE = `// Generated hook tests - DO NOT EDIT MANUALLY
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUsers, useCreateUser } from '../users';
import { renderWithQueryClient, createMockApiClient } from '../../../testing/hook-test-utils';

// Mock the API client
vi.mock('../../services/api', () => ({
  usersApi: createMockApiClient().users,
}));

describe('Users Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useUsers', () => {
    it('should fetch users successfully', async () => {
      const mockUsers = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      ];

      const { usersApi } = await import('../../services/api');
      vi.mocked(usersApi.list).mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useUsers(), {
        wrapper: ({ children }) => renderWithQueryClient(<div>{children}</div>),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUsers);
      expect(usersApi.list).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      const { usersApi } = await import('../../services/api');
      vi.mocked(usersApi.list).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useUsers(), {
        wrapper: ({ children }) => renderWithQueryClient(<div>{children}</div>),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('API Error');
    });
  });

  describe('useCreateUser', () => {
    it('should create user successfully', async () => {
      const newUser = { name: 'New User', email: 'new@example.com' };
      const createdUser = { id: '3', ...newUser };

      const { usersApi } = await import('../../services/api');
      vi.mocked(usersApi.create).mockResolvedValue(createdUser);

      const { result } = renderHook(() => useCreateUser(), {
        wrapper: ({ children }) => renderWithQueryClient(<div>{children}</div>),
      });

      result.current.mutate(newUser);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(createdUser);
      expect(usersApi.create).toHaveBeenCalledWith(newUser);
    });
  });
});
`;

// Example component demonstrating hook usage
export const EXAMPLE_COMPONENT_TEMPLATE = `// Example component using generated hooks
import React, { useState } from 'react';
import { useUsers, useCreateUser, useUser, useUpdateUser, useDeleteUser } from '../hooks/users';

export function UsersManagement() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Query hooks
  const usersQuery = useUsers();
  const userQuery = useUser(selectedUserId!, { enabled: !!selectedUserId });

  // Mutation hooks
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const handleCreateUser = async (userData: { name: string; email: string }) => {
    try {
      await createUserMutation.mutateAsync(userData);
      setShowCreateForm(false);
      // Query will be automatically invalidated and refetched
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleUpdateUser = async (id: string, userData: { name: string; email: string }) => {
    try {
      await updateUserMutation.mutateAsync({ id, data: userData });
      // Query will be automatically invalidated and refetched
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUserMutation.mutateAsync({ id });
        if (selectedUserId === id) {
          setSelectedUserId(null);
        }
        // Query will be automatically invalidated and refetched
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  if (usersQuery.isLoading) {
    return <div className="p-4">Loading users...</div>;
  }

  if (usersQuery.error) {
    return (
      <div className="p-4 text-red-600">
        Error loading users: {usersQuery.error.message}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Users List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">All Users</h2>
          {usersQuery.data?.map((user) => (
            <div
              key={user.id}
              className={\`p-4 border rounded-lg cursor-pointer transition-colors \${
                selectedUserId === user.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }\`}
              onClick={() => setSelectedUserId(user.id)}
            >
              <h3 className="font-medium">{user.name}</h3>
              <p className="text-sm text-gray-600">{user.email}</p>
              <div className="mt-2 space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser(user.id);
                  }}
                  disabled={deleteUserMutation.isPending}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* User Details */}
        <div>
          {selectedUserId && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">User Details</h2>
              {userQuery.isLoading && <div>Loading user details...</div>}
              {userQuery.error && (
                <div className="text-red-600">
                  Error: {userQuery.error.message}
                </div>
              )}
              {userQuery.data && (
                <UserEditForm
                  user={userQuery.data}
                  onSave={(userData) => handleUpdateUser(selectedUserId, userData)}
                  isLoading={updateUserMutation.isPending}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New User</h3>
            <UserCreateForm
              onSave={handleCreateUser}
              onCancel={() => setShowCreateForm(false)}
              isLoading={createUserMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Form components (simplified)
function UserEditForm({ user, onSave, isLoading }: any) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, email });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}

function UserCreateForm({ onSave, onCancel, isLoading }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, email });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div className="flex space-x-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create User'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
`;

// AI Streaming component example
export const AI_STREAMING_EXAMPLE = `// Example AI streaming chat component
import React, { useState } from 'react';
import { useStreamingChat, useAIModels, useAIProviderHealth } from '../hooks/ai';

export function AIChat() {
  const [currentModel, setCurrentModel] = useState('llama3.1');
  const [currentProvider, setCurrentProvider] = useState<'ollama' | 'openai'>('ollama');

  const { data: models } = useAIModels(currentProvider);
  const { data: health } = useAIProviderHealth();
  
  const {
    messages,
    sendMessage,
    isStreaming,
    stopStreaming,
    clearMessages,
  } = useStreamingChat({
    provider: currentProvider,
    model: currentModel,
    onMessage: (message) => {
      console.log('New AI message chunk:', message.content);
    },
    onError: (error) => {
      console.error('AI streaming error:', error);
    },
  });

  const handleSendMessage = async (content: string) => {
    await sendMessage(content);
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Header with model selection */}
      <div className="mb-4 p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">AI Chat</h1>
          <div className="flex items-center space-x-4">
            <select
              value={currentProvider}
              onChange={(e) => setCurrentProvider(e.target.value as 'ollama' | 'openai')}
              className="px-3 py-1 border rounded"
            >
              <option value="ollama">Ollama (Local)</option>
              <option value="openai">OpenAI (Cloud)</option>
            </select>
            <select
              value={currentModel}
              onChange={(e) => setCurrentModel(e.target.value)}
              className="px-3 py-1 border rounded"
              disabled={!models?.length}
            >
              {models?.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
            <div className={\`w-3 h-3 rounded-full \${
              health?.[currentProvider]?.status === 'healthy' 
                ? 'bg-green-500' 
                : 'bg-red-500'
            }\`} />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 border rounded-lg">
        {messages.map((message, index) => (
          <div
            key={index}
            className={\`flex \${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }\`}
          >
            <div
              className={\`max-w-3/4 p-3 rounded-lg \${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }\`}
            >
              <pre className="whitespace-pre-wrap font-sans">
                {message.content}
              </pre>
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-pulse">AI is typing...</div>
                <button
                  onClick={stopStreaming}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Stop
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSendMessage={handleSendMessage} isStreaming={isStreaming} />

      {/* Actions */}
      <div className="mt-2 flex justify-center">
        <button
          onClick={clearMessages}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Clear Messages
        </button>
      </div>
    </div>
  );
}

function ChatInput({ onSendMessage, isStreaming }: any) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isStreaming) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="flex-1 p-3 border rounded-lg"
        disabled={isStreaming}
      />
      <button
        type="submit"
        disabled={!message.trim() || isStreaming}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
`;
