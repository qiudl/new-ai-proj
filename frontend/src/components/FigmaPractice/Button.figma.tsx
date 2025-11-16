/**
 * Figma Code Connect for Button Component
 *
 * To connect this component to Figma:
 * 1. Get your Figma component URL (e.g., https://www.figma.com/file/FILE_KEY/DESIGN_NAME?node-id=NODE_ID)
 * 2. Run: npx figma connect create <FIGMA_URL>
 * 3. Replace the placeholder below with your actual Figma file info
 *
 * Documentation: https://github.com/figma/code-connect
 */

import figmaConnect from '@figma/code-connect';
import { Button } from './Button';

/**
 * Example Code Connect configuration
 * Replace 'YOUR_FIGMA_FILE_KEY' and 'YOUR_NODE_ID' with actual values from your Figma file
 */

// Primary Button variant
figmaConnect.connect(Button, {
  // Figma node URL - get this from your Figma file
  // Example: https://www.figma.com/file/abc123/Design?node-id=1-2
  figmaNodeUrl: 'https://www.figma.com/file/YOUR_FIGMA_FILE_KEY/Design?node-id=YOUR_NODE_ID',

  // Map Figma properties to component props
  props: {
    // Map Figma text layer to children prop
    children: figmaConnect.textContent('Label'),

    // Map Figma variant property to variant prop
    variant: figmaConnect.enum('Variant', {
      Primary: 'primary',
      Secondary: 'secondary',
      Outline: 'outline',
      Text: 'text',
    }),

    // Map Figma size property to size prop
    size: figmaConnect.enum('Size', {
      Small: 'small',
      Medium: 'medium',
      Large: 'large',
    }),

    // Map Figma boolean property to disabled state
    disabled: figmaConnect.boolean('Disabled'),

    // Map Figma boolean property to loading state
    loading: figmaConnect.boolean('Loading'),

    // Map Figma boolean property to full width
    fullWidth: figmaConnect.boolean('Full Width'),
  },

  // Example code snippet shown in Figma
  example: ({ children, variant, size, disabled, loading, fullWidth }) => (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      loading={loading}
      fullWidth={fullWidth}
    >
      {children}
    </Button>
  ),
});

// You can add multiple connects for different variants or states
// Example: Button with icon
figmaConnect.connect(Button, {
  figmaNodeUrl: 'https://www.figma.com/file/YOUR_FIGMA_FILE_KEY/Design?node-id=YOUR_ICON_BUTTON_NODE_ID',

  props: {
    children: figmaConnect.textContent('Label'),
    icon: figmaConnect.string('Icon'),
    variant: figmaConnect.enum('Variant', {
      Primary: 'primary',
      Secondary: 'secondary',
    }),
  },

  example: ({ children, icon, variant }) => (
    <Button variant={variant} icon={icon}>
      {children}
    </Button>
  ),
});

export default Button;
