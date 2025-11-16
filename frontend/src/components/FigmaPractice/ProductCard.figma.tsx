/**
 * Figma Code Connect for ProductCard Component
 *
 * This example shows how to connect a complex component with multiple props
 * including images, colors, and optional properties
 */

import figmaConnect from '@figma/code-connect';
import { ProductCard } from './ProductCard';

// Main ProductCard connection
figmaConnect.connect(ProductCard, {
  figmaNodeUrl: 'https://www.figma.com/file/YOUR_FIGMA_FILE_KEY/Design?node-id=YOUR_PRODUCT_CARD_NODE_ID',

  props: {
    // Required props
    id: figmaConnect.string('Product ID'),
    name: figmaConnect.textContent('Product Name'),
    price: figmaConnect.number('Price'),

    // Optional props
    icon: figmaConnect.string('Icon', { optional: true }),
    image: figmaConnect.instance('Product Image', { optional: true }),
    colorTheme: figmaConnect.enum('Color Theme', {
      Default: 'default',
      Black: 'black',
      Pink: 'pink',
    }),

    // Boolean flags
    showHeart: figmaConnect.boolean('Show Heart'),
    showShoppingCart: figmaConnect.boolean('Show Shopping Cart'),

    // Additional metadata
    rating: figmaConnect.number('Rating', { optional: true }),
    reviewCount: figmaConnect.number('Review Count', { optional: true }),
  },

  example: ({
    id,
    name,
    price,
    icon,
    image,
    colorTheme,
    showHeart,
    showShoppingCart,
    rating,
    reviewCount,
  }) => (
    <ProductCard
      id={id}
      name={name}
      price={price}
      icon={icon}
      image={image}
      colorTheme={colorTheme}
      showHeart={showHeart}
      showShoppingCart={showShoppingCart}
      rating={rating}
      reviewCount={reviewCount}
    />
  ),
});

// ProductCard with discount variant
figmaConnect.connect(ProductCard, {
  figmaNodeUrl: 'https://www.figma.com/file/YOUR_FIGMA_FILE_KEY/Design?node-id=YOUR_DISCOUNT_CARD_NODE_ID',

  props: {
    id: figmaConnect.string('Product ID'),
    name: figmaConnect.textContent('Product Name'),
    price: figmaConnect.number('Price'),
    originalPrice: figmaConnect.number('Original Price'),
    discountPercent: figmaConnect.number('Discount Percent'),
    colorTheme: figmaConnect.enum('Color Theme', {
      Default: 'default',
      Black: 'black',
      Pink: 'pink',
    }),
  },

  example: ({ id, name, price, originalPrice, discountPercent, colorTheme }) => (
    <ProductCard
      id={id}
      name={name}
      price={price}
      originalPrice={originalPrice}
      discountPercent={discountPercent}
      colorTheme={colorTheme}
    />
  ),
});

export default ProductCard;
