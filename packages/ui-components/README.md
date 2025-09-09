# @farm/ui-components

The FARM Framework UI components package provides reusable React components that accelerate interface development, including AI chat interfaces, data visualization components, and common UI patterns.

## 🚀 Quick Start

```bash
npm install @farm/ui-components
```

```typescript
import { ChatInterface, DataChart, Button } from '@farm/ui-components';

function App() {
  return (
    <div>
      <ChatInterface onSendMessage={handleMessage} />
      <DataChart data={chartData} />
      <Button variant="primary">Click me</Button>
    </div>
  );
}
```

## 📋 Core Features

### AI Components
- **ChatInterface**: Complete chat UI with message handling
- **MessageList**: Message display with markdown support
- **MessageInput**: Input component with send functionality
- **TypingIndicator**: Loading indicator for AI responses

### Data Visualization
- **DataChart**: Configurable charts and graphs
- **MetricCard**: Display key metrics and statistics
- **DataTable**: Sortable and filterable data tables
- **ProgressBar**: Progress indicators and loading states

### Form Components
- **Form**: Form wrapper with validation
- **Input**: Text input with validation states
- **Select**: Dropdown selection component
- **Checkbox**: Checkbox input component
- **Button**: Button component with variants

### Layout Components
- **Container**: Responsive container wrapper
- **Grid**: CSS Grid layout component
- **Stack**: Vertical/horizontal stack layout
- **Card**: Card container component
- **Modal**: Modal dialog component

## 🏗️ Architecture

```
@farm/ui-components
├── AI/
│   ├── ChatInterface       # Complete chat UI
│   ├── MessageList         # Message display
│   ├── MessageInput        # Input component
│   └── TypingIndicator     # Loading indicator
├── Data/
│   ├── DataChart           # Chart component
│   ├── MetricCard          # Metric display
│   ├── DataTable           # Data table
│   └── ProgressBar         # Progress indicator
├── Forms/
│   ├── Form                # Form wrapper
│   ├── Input               # Text input
│   ├── Select              # Dropdown
│   ├── Checkbox            # Checkbox
│   └── Button              # Button
├── Layout/
│   ├── Container           # Container wrapper
│   ├── Grid                # Grid layout
│   ├── Stack               # Stack layout
│   ├── Card                # Card container
│   └── Modal               # Modal dialog
└── Utils/
    ├── hooks/              # Custom hooks
    ├── types/              # TypeScript types
    └── styles/             # Styling utilities
```

## 📚 API Reference

### AI Components

#### ChatInterface
Complete chat interface with message handling and AI integration.

```typescript
import { ChatInterface } from '@farm/ui-components';

function App() {
  const handleSendMessage = async (message: string) => {
    // Handle message sending
    console.log('Sending message:', message);
  };

  return (
    <ChatInterface
      onSendMessage={handleSendMessage}
      messages={messages}
      isLoading={isLoading}
      placeholder="Type your message..."
      maxLength={1000}
    />
  );
}
```

#### MessageList
Display list of messages with markdown support.

```typescript
import { MessageList } from '@farm/ui-components';

function ChatMessages() {
  return (
    <MessageList
      messages={messages}
      onMessageClick={handleMessageClick}
      showTimestamps={true}
      markdown={true}
    />
  );
}
```

#### MessageInput
Input component for sending messages.

```typescript
import { MessageInput } from '@farm/ui-components';

function ChatInput() {
  return (
    <MessageInput
      onSend={handleSend}
      placeholder="Type your message..."
      maxLength={1000}
      disabled={isLoading}
      showCharacterCount={true}
    />
  );
}
```

### Data Components

#### DataChart
Configurable chart component for data visualization.

```typescript
import { DataChart } from '@farm/ui-components';

function Dashboard() {
  const chartData = [
    { name: 'Jan', value: 100 },
    { name: 'Feb', value: 150 },
    { name: 'Mar', value: 200 }
  ];

  return (
    <DataChart
      data={chartData}
      type="line"
      title="Monthly Sales"
      xAxis="name"
      yAxis="value"
      height={300}
    />
  );
}
```

#### MetricCard
Display key metrics and statistics.

```typescript
import { MetricCard } from '@farm/ui-components';

function Metrics() {
  return (
    <MetricCard
      title="Total Users"
      value="1,234"
      change="+12%"
      changeType="positive"
      icon="users"
    />
  );
}
```

#### DataTable
Sortable and filterable data table.

```typescript
import { DataTable } from '@farm/ui-components';

function UserTable() {
  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'status', label: 'Status', filterable: true }
  ];

  return (
    <DataTable
      data={users}
      columns={columns}
      onSort={handleSort}
      onFilter={handleFilter}
      pagination={true}
      pageSize={10}
    />
  );
}
```

### Form Components

#### Form
Form wrapper with validation and submission handling.

```typescript
import { Form, Input, Button } from '@farm/ui-components';

function UserForm() {
  return (
    <Form onSubmit={handleSubmit} validation={validation}>
      <Input
        name="name"
        label="Name"
        required
        placeholder="Enter your name"
      />
      <Input
        name="email"
        label="Email"
        type="email"
        required
        placeholder="Enter your email"
      />
      <Button type="submit" variant="primary">
        Submit
      </Button>
    </Form>
  );
}
```

#### Input
Text input with validation states.

```typescript
import { Input } from '@farm/ui-components';

function MyInput() {
  return (
    <Input
      name="username"
      label="Username"
      placeholder="Enter username"
      required
      error="Username is required"
      helpText="Choose a unique username"
    />
  );
}
```

#### Button
Button component with variants and states.

```typescript
import { Button } from '@farm/ui-components';

function Buttons() {
  return (
    <div>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="outline">Outline</Button>
      <Button loading={true}>Loading</Button>
      <Button disabled={true}>Disabled</Button>
    </div>
  );
}
```

### Layout Components

#### Container
Responsive container wrapper.

```typescript
import { Container } from '@farm/ui-components';

function App() {
  return (
    <Container maxWidth="lg" padding="md">
      <h1>My App</h1>
    </Container>
  );
}
```

#### Grid
CSS Grid layout component.

```typescript
import { Grid, GridItem } from '@farm/ui-components';

function Layout() {
  return (
    <Grid columns={3} gap="md">
      <GridItem span={2}>
        <div>Main content</div>
      </GridItem>
      <GridItem span={1}>
        <div>Sidebar</div>
      </GridItem>
    </Grid>
  );
}
```

#### Card
Card container component.

```typescript
import { Card, CardHeader, CardBody, CardFooter } from '@farm/ui-components';

function UserCard() {
  return (
    <Card>
      <CardHeader>
        <h3>User Profile</h3>
      </CardHeader>
      <CardBody>
        <p>User information goes here</p>
      </CardBody>
      <CardFooter>
        <Button>Edit Profile</Button>
      </CardFooter>
    </Card>
  );
}
```

#### Modal
Modal dialog component.

```typescript
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@farm/ui-components';

function MyModal() {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        <h2>Confirm Action</h2>
      </ModalHeader>
      <ModalBody>
        <p>Are you sure you want to delete this item?</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Delete
        </Button>
      </ModalFooter>
    </Modal>
  );
}
```

## 🎨 Styling

### CSS Classes
Components use CSS classes for styling and can be customized with CSS.

```css
/* Custom button styles */
.farm-button--primary {
  background-color: #007bff;
  color: white;
}

.farm-button--primary:hover {
  background-color: #0056b3;
}
```

### CSS Variables
Use CSS variables for consistent theming.

```css
:root {
  --farm-primary-color: #007bff;
  --farm-secondary-color: #6c757d;
  --farm-success-color: #28a745;
  --farm-danger-color: #dc3545;
  --farm-warning-color: #ffc107;
  --farm-info-color: #17a2b8;
}
```

### Tailwind CSS
Components are built with Tailwind CSS and can be customized.

```typescript
import { Button } from '@farm/ui-components';

function CustomButton() {
  return (
    <Button 
      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
    >
      Custom Button
    </Button>
  );
}
```

## 🔧 Configuration

### Theme Configuration
Configure component themes and styling.

```typescript
import { ThemeProvider } from '@farm/ui-components';

const theme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '3rem'
  }
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <MyApp />
    </ThemeProvider>
  );
}
```

## 🐛 Troubleshooting

### Common Issues

#### Styling Issues
```typescript
// Ensure CSS is imported
import '@farm/ui-components/dist/styles.css';
```

#### TypeScript Issues
```typescript
// Import types
import type { ButtonProps, ChatInterfaceProps } from '@farm/ui-components';
```

### Getting Help

- **GitHub Issues**: [Report bugs](https://github.com/farm-stack/framework/issues)
- **Documentation**: [UI Components Reference](../docs/reference/ui-components/)
- **Discussions**: [Community help](https://github.com/farm-stack/framework/discussions)

## 🔄 Changelog

### v0.2.0
- Added comprehensive AI components
- Enhanced data visualization components
- Improved form components with validation
- Added layout components and utilities

### v0.1.0
- Initial release with basic components
- Button, Input, and Card components
- Basic styling and theming support

## 📄 License

MIT © FARM Framework