/**
 * Figma Code Connect for SearchBar Component
 *
 * This example shows how to connect a controlled input component
 */

import figmaConnect from '@figma/code-connect';
import { SearchBar } from './SearchBar';

// SearchBar - Controlled mode
figmaConnect.connect(SearchBar, {
  figmaNodeUrl: 'https://www.figma.com/file/YOUR_FIGMA_FILE_KEY/Design?node-id=YOUR_SEARCHBAR_NODE_ID',

  props: {
    // Text content from Figma placeholder
    placeholder: figmaConnect.string('Placeholder'),

    // Variant mapping
    variant: figmaConnect.enum('Variant', {
      Default: 'default',
      Rounded: 'rounded',
      Minimal: 'minimal',
    }),

    // Size mapping
    size: figmaConnect.enum('Size', {
      Small: 'small',
      Medium: 'medium',
      Large: 'large',
    }),

    // Boolean states
    showSearchButton: figmaConnect.boolean('Show Search Button'),
    showClearButton: figmaConnect.boolean('Show Clear Button'),
  },

  example: ({ placeholder, variant, size, showSearchButton, showClearButton }) => {
    const [searchValue, setSearchValue] = React.useState('');

    return (
      <SearchBar
        value={searchValue}
        onChange={setSearchValue}
        onSearch={(value) => console.log('Search:', value)}
        placeholder={placeholder}
        variant={variant}
        size={size}
        showSearchButton={showSearchButton}
        showClearButton={showClearButton}
      />
    );
  },
});

// SearchBar with custom icon
figmaConnect.connect(SearchBar, {
  figmaNodeUrl: 'https://www.figma.com/file/YOUR_FIGMA_FILE_KEY/Design?node-id=YOUR_SEARCHBAR_ICON_NODE_ID',

  props: {
    placeholder: figmaConnect.string('Placeholder'),
    searchIcon: figmaConnect.string('Search Icon'),
    variant: figmaConnect.enum('Variant', {
      Default: 'default',
      Rounded: 'rounded',
    }),
  },

  example: ({ placeholder, searchIcon, variant }) => (
    <SearchBar
      placeholder={placeholder}
      searchIcon={searchIcon}
      variant={variant}
      onSearch={(value) => console.log('Search:', value)}
    />
  ),
});

export default SearchBar;
