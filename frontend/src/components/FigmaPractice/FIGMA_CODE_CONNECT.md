# Figma Code Connect Setup Guide

This guide explains how to connect the FigmaPractice components to your Figma designs using Figma Code Connect.

## What is Figma Code Connect?

Figma Code Connect creates a direct link between your Figma design components and their code implementations. When developers inspect a component in Figma, they'll see:
- The actual code used in your project
- Accurate prop mappings
- Working examples
- Links to the codebase

## Prerequisites

1. **Figma Account** with access to your design file
2. **Figma Personal Access Token** - Get this from your [Figma account settings](https://www.figma.com/developers/api#access-tokens)
3. **Figma Design File** with components you want to connect

## Setup Steps

### 1. Install Dependencies

Already completed! The `@figma/code-connect` package is installed.

### 2. Configure Your Figma Token

Create a `.env.local` file (already in `.gitignore`) and add your Figma token:

```bash
# .env.local
FIGMA_ACCESS_TOKEN=your_figma_personal_access_token_here
```

**⚠️ Never commit your Figma token to version control!**

### 3. Get Component URLs from Figma

For each component you want to connect:

1. Open your Figma design file
2. Select the component in the canvas
3. Right-click → "Copy/Paste as" → "Copy link"
4. You'll get a URL like: `https://www.figma.com/file/ABC123/Design?node-id=1-2`

### 4. Update Code Connect Files

We've created template `.figma.tsx` files for key components. Update them with your Figma URLs:

#### Example: Button.figma.tsx

```typescript
figmaConnect.connect(Button, {
  // Replace this with your actual Figma component URL
  figmaNodeUrl: 'https://www.figma.com/file/ABC123/MyDesign?node-id=12-34',

  props: {
    children: figmaConnect.textContent('Label'),
    variant: figmaConnect.enum('Variant', {
      Primary: 'primary',
      Secondary: 'secondary',
    }),
    // ... other props
  },

  example: ({ children, variant }) => (
    <Button variant={variant}>{children}</Button>
  ),
});
```

### 5. Verify Configuration

Check that your `figma.config.json` is set up correctly:

```json
{
  "codeConnect": {
    "include": ["src/components/FigmaPractice/**/*.figma.tsx"],
    "parser": "react"
  }
}
```

### 6. Test Locally

Parse your Code Connect files to verify they're valid:

```bash
npx figma connect parse --dir src/components/FigmaPractice
```

### 7. Publish to Figma

Once your URLs are configured, publish the connections:

```bash
# Publish all connections
npx figma connect publish

# Or specify a directory
npx figma connect publish --dir src/components/FigmaPractice

# Dry run (test without publishing)
npx figma connect publish --dry-run
```

### 8. Verify in Figma

1. Open your Figma file
2. Select a connected component
3. Look for the "Dev Mode" tab
4. You should see your code examples!

## Available Template Files

We've created Code Connect templates for:

- ✅ **Button.figma.tsx** - Primary buttons with variants and sizes
- ✅ **ProductCard.figma.tsx** - Complex component with images and metadata
- ✅ **SearchBar.figma.tsx** - Controlled input component
- ✅ **IconButton.figma.tsx** - Icon buttons with tooltips

### Creating More Connections

For other components, follow this pattern:

```bash
# Generate a new Code Connect file from Figma URL
npx figma connect create https://www.figma.com/file/YOUR_FILE/Design?node-id=1-2
```

This will create a new `.figma.tsx` file with boilerplate code.

## Property Mapping Guide

### Basic Types

```typescript
// String
name: figmaConnect.string('Component Property')

// Number
price: figmaConnect.number('Price')

// Boolean
disabled: figmaConnect.boolean('Disabled')

// Text content from layer
children: figmaConnect.textContent('Text Layer Name')
```

### Variants and Enums

```typescript
variant: figmaConnect.enum('Variant Property', {
  'Primary': 'primary',    // Figma value: Code value
  'Secondary': 'secondary',
  'Outline': 'outline',
})
```

### Optional Properties

```typescript
icon: figmaConnect.string('Icon', { optional: true })
```

### Images and Instances

```typescript
image: figmaConnect.instance('Image Component', { optional: true })
```

## Best Practices

### 1. Keep Figma and Code in Sync

- Update Code Connect files when component props change
- Re-publish after making updates: `npx figma connect publish`

### 2. Use Meaningful Examples

```typescript
example: ({ variant, children }) => (
  // Show realistic usage, not just props
  <Button variant={variant} onClick={() => console.log('Clicked')}>
    {children}
  </Button>
)
```

### 3. Document Variants Separately

If a component has distinctly different use cases, create multiple connections:

```typescript
// Primary usage
figmaConnect.connect(Button, { ... });

// Icon button usage
figmaConnect.connect(Button, { ... });
```

### 4. Include Accessibility Props

```typescript
props: {
  ariaLabel: figmaConnect.string('Aria Label'),
  role: figmaConnect.string('ARIA Role', { optional: true }),
}
```

### 5. Use Component Names from Figma

Match your Figma component names to make mapping intuitive:
- Figma: "Button/Primary" → Code: `variant="primary"`
- Figma: "Size/Large" → Code: `size="large"`

## Troubleshooting

### Connection Not Showing in Figma

1. Check that you published: `npx figma connect publish`
2. Verify your Figma token is set correctly
3. Ensure the `figmaNodeUrl` exactly matches your component URL
4. Refresh your Figma tab

### Parse Errors

```bash
# Check for syntax errors
npx figma connect parse --dir src/components/FigmaPractice

# Enable verbose logging
npx figma connect publish --verbose
```

### Wrong Props Showing

- Double-check property names in Figma match your mappings
- Verify enum values match exactly (case-sensitive)
- Check for typos in component instance names

## Unpublishing Connections

To remove connections from Figma:

```bash
# Unpublish all
npx figma connect unpublish

# Unpublish specific directory
npx figma connect unpublish --dir src/components/FigmaPractice
```

## CI/CD Integration

Add to your CI pipeline to ensure connections stay valid:

```yaml
# Example GitHub Actions
- name: Validate Figma Code Connect
  run: npx figma connect parse --exit-on-unreadable-files
```

## Additional Resources

- [Figma Code Connect Documentation](https://github.com/figma/code-connect)
- [Figma Dev Mode Guide](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode)
- [Code Connect Examples](https://github.com/figma/code-connect/tree/main/examples)

## Next Steps

1. **Get your Figma Personal Access Token** from [Figma Settings](https://www.figma.com/developers/api#access-tokens)
2. **Find your design file** and copy component URLs
3. **Update the template files** with your actual URLs
4. **Publish to Figma**: `npx figma connect publish`
5. **Test in Figma Dev Mode**

---

**Note**: The template files (`.figma.tsx`) contain placeholder URLs. You must replace these with your actual Figma component URLs before publishing.
