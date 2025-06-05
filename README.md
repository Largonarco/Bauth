# Auth CLI Tool

A command-line interface tool for managing authentication-related resources in your application.

## Installation

### For Module Users

#### Global Installation (Recommended for CLI usage)

```bash
# Install the package globally
npm install -g @embos/auth

# Now you can use the CLI from anywhere
auth-cli users list
```

#### Local Installation (For project-specific usage)

```bash
# Install the package in your project
npm install @embos/auth

# Use the CLI through npx
npx auth-cli users list
```

### For Developers

```bash
# Clone the repository
git clone <repository-url>
cd induced_auth

# Install dependencies
yarn install

# Build the project
yarn build

# Link the CLI tool globally (for development)
yarn link
```

## Configuration

Create a `.env` file in your project root with the following variables:

```env
API_KEY=your_api_key_here
BASE_URL=http://localhost:3000  # Optional, defaults to http://localhost:3000
```

## Usage

The CLI tool provides commands for managing users, projects, user-project relations, and WorkOS configurations.

### Users

```bash
# List all users
auth-cli users list

# Get a user by ID
auth-cli users get <id>

# Create a new user
auth-cli users create -e <email> -f <first-name> -l <last-name> [-p <phone>]

# Update a user
auth-cli users update <id> [-e <email>] [-p <phone>] [-f <first-name>] [-l <last-name>]

# Delete a user
auth-cli users delete <id>
```

### Projects

```bash
# List all projects
auth-cli projects list

# Get a project by ID
auth-cli projects get <id>

# Create a new project
auth-cli projects create -n <name> -w <workos-config-id> -o <organization-name> [-d <description>]

# Update a project
auth-cli projects update <id> [-n <name>] [-d <description>] [-w <workos-config>] [-o <organization-name>]

# Delete a project
auth-cli projects delete <id>
```

### User-Project Relations

```bash
# List all user-project relations
auth-cli relations list

# Get a user-project relation by ID
auth-cli relations get <id>

# Create a new user-project relation
auth-cli relations create -u <user-id> -p <project-id> -r <role>

# Update a user-project relation
auth-cli relations update <id> [-r <role>]

# Delete a user-project relation
auth-cli relations delete <id>
```

### WorkOS Configurations

```bash
# List all WorkOS configurations
auth-cli workos list

# Get a WorkOS configuration by ID
auth-cli workos get <id>

# Create a new WorkOS configuration
auth-cli workos create \
  --invite-only \
  --is-default \
  --rbac-enabled \
  --authkit-enabled \
  --workos-client-id-staging <staging-client-id> \
  --workos-client-secret-staging <staging-client-secret> \
  [--enabled-auth-methods <methods...>] \
  [--metadata <json-string>] \
  [--allowed-social-providers <providers...>] \
  [--workos-client-id-production <production-client-id>] \
  [--workos-client-secret-production <production-client-secret>]

# Update a WorkOS configuration
auth-cli workos update <id> \
  [--is-default] \
  [--invite-only] \
  [--rbac-enabled] \
  [--workos-client-id <client-id>] \
  [--authkit-enabled] \
  [--workos-client-secret <client-secret>] \
  [--metadata <json-string>] \
  [--enabled-auth-methods <methods...>] \
  [--allowed-social-providers <providers...>]

# Delete a WorkOS configuration
auth-cli workos delete <id>
```

## Common Options

Most list commands support the following options:

- `-p, --page <number>`: Page number (default: 1)
- `-l, --limit <number>`: Items per page (default: 10)

## Examples

```bash
# List all users with pagination
auth-cli users list -p 2 -l 20

# Create a new user
auth-cli users create -e john@example.com -f John -l Doe -p +1234567890

# Create a new project
auth-cli projects create -n "My Project" -w workos-config-123 -o "My Organization" -d "Project description"

# Create a user-project relation
auth-cli relations create -u user-123 -p project-456 -r admin

# Create a WorkOS configuration
auth-cli workos create \
  --invite-only \
  --is-default \
  --rbac-enabled \
  --authkit-enabled \
  --workos-client-id-staging "staging-client-123" \
  --workos-client-secret-staging "staging-secret-456" \
  --enabled-auth-methods "password" "google" "github" \
  --metadata '{"custom_field": "value"}' \
  --allowed-social-providers "google" "github"
```
