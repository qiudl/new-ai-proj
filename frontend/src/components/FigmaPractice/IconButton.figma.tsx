/**
 * Figma Code Connect for IconButton Component
 *
 * This example shows a simple icon button with variants and tooltips
 */

import figmaConnect from '@figma/code-connect';
import { IconButton } from './IconButton';

// IconButton - Basic variants
figmaConnect.connect(IconButton, {
  figmaNodeUrl: 'https://www.figma.com/file/YOUR_FIGMA_FILE_KEY/Design?node-id=YOUR_ICON_BUTTON_NODE_ID',

  props: {
    // Icon mapping - can be emoji or React element
    icon: figmaConnect.string('Icon'),

    // Variant mapping
    variant: figmaConnect.enum('Variant', {
      Default: 'default',
      Primary: 'primary',
      Secondary: 'secondary',
      Outline: 'outline',
      Ghost: 'ghost',
      Danger: 'danger',
    }),

    // Size mapping
    size: figmaConnect.enum('Size', {
      Small: 'small',
      Medium: 'medium',
      Large: 'large',
    }),

    // Shape mapping
    shape: figmaConnect.enum('Shape', {
      Circle: 'circle',
      Square: 'square',
      Rounded: 'rounded',
    }),

    // Optional tooltip
    tooltip: figmaConnect.string('Tooltip', { optional: true }),
    tooltipPosition: figmaConnect.enum('Tooltip Position', {
      Top: 'top',
      Bottom: 'bottom',
      Left: 'left',
      Right: 'right',
    }),

    // States
    disabled: figmaConnect.boolean('Disabled'),
    loading: figmaConnect.boolean('Loading'),
  },

  example: ({
    icon,
    variant,
    size,
    shape,
    tooltip,
    tooltipPosition,
    disabled,
    loading,
  }) => (
    <IconButton
      icon={icon}
      variant={variant}
      size={size}
      shape={shape}
      tooltip={tooltip}
      tooltipPosition={tooltipPosition}
      disabled={disabled}
      loading={loading}
      onClick={() => console.log('Icon button clicked')}
    />
  ),
});

// IconButton with aria-label
figmaConnect.connect(IconButton, {
  figmaNodeUrl: 'https://www.figma.com/file/YOUR_FIGMA_FILE_KEY/Design?node-id=YOUR_ACCESSIBLE_ICON_BUTTON_NODE_ID',

  props: {
    icon: figmaConnect.string('Icon'),
    ariaLabel: figmaConnect.string('Aria Label'),
    variant: figmaConnect.enum('Variant', {
      Default: 'default',
      Primary: 'primary',
    }),
  },

  example: ({ icon, ariaLabel, variant }) => (
    <IconButton
      icon={icon}
      ariaLabel={ariaLabel}
      variant={variant}
      onClick={() => console.log('Accessible icon button clicked')}
    />
  ),
});

export default IconButton;
