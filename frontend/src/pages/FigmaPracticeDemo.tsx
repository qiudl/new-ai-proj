/**
 * Figma Practice Components - Integration Demo Page
 *
 * This page demonstrates how to integrate all FigmaPractice components
 * into a real-world e-commerce application
 */

import React, { useState } from 'react';
import { Card, Row, Col, Space, Divider, Typography, Badge } from 'antd';
import {
  Button,
  ProductCard,
  SearchBar,
  CategoryTabs,
  IconButton,
  ColorSelector,
  QuantitySelector,
  CartItem,
  PromotionBanner,
} from '../components/FigmaPractice';

const { Title, Text } = Typography;

// Mock product data
const products = [
  {
    id: '1',
    name: 'Classic White Sneakers',
    price: 89,
    icon: '👟',
    colorTheme: 'default' as const,
    colors: [
      { id: 'white', name: 'White', value: '#FFFFFF' },
      { id: 'black', name: 'Black', value: '#000000' },
      { id: 'gray', name: 'Gray', value: '#808080' },
    ],
  },
  {
    id: '2',
    name: 'Summer Dress',
    price: 129,
    icon: '👗',
    colorTheme: 'pink' as const,
    colors: [
      { id: 'pink', name: 'Pink', value: '#FFB6C1' },
      { id: 'blue', name: 'Blue', value: '#87CEEB' },
      { id: 'yellow', name: 'Yellow', value: '#FFD700' },
    ],
  },
  {
    id: '3',
    name: 'Leather Bag',
    price: 199,
    icon: '👜',
    colorTheme: 'black' as const,
    colors: [
      { id: 'brown', name: 'Brown', value: '#8B4513' },
      { id: 'black', name: 'Black', value: '#000000' },
    ],
  },
  {
    id: '4',
    name: 'Denim Jeans',
    price: 79,
    icon: '👖',
    colorTheme: 'default' as const,
    colors: [
      { id: 'blue', name: 'Blue', value: '#4169E1' },
      { id: 'black', name: 'Black', value: '#000000' },
    ],
  },
];

const categories = [
  { id: 'all', label: 'All Products', icon: '🛍️' },
  { id: 'clothing', label: 'Clothing', icon: '👕' },
  { id: 'shoes', label: 'Shoes', icon: '👟' },
  { id: 'accessories', label: 'Accessories', icon: '👜' },
];

interface CartItemType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  icon?: string;
  selectedColor?: string;
}

const FigmaPracticeDemo: React.FC = () => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Category state
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Cart state
  const [cartItems, setCartItems] = useState<CartItemType[]>([
    {
      id: '1',
      name: 'Classic White Sneakers',
      price: 89,
      quantity: 1,
      icon: '👟',
      selectedColor: 'White',
    },
  ]);
  const [selectedCartItems, setSelectedCartItems] = useState<string[]>(['1']);

  // Product selection states
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Promotion banner state
  const [showBanner, setShowBanner] = useState(true);

  // Handlers
  const handleSearch = (query: string) => {
    console.log('Searching for:', query);
    setSearchQuery(query);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleAddToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const quantity = quantities[productId] || 1;
    const existingItem = cartItems.find((item) => item.id === productId);

    if (existingItem) {
      // Update quantity
      setCartItems(
        cartItems.map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      // Add new item
      setCartItems([
        ...cartItems,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
          icon: product.icon,
          selectedColor: selectedColors[productId],
        },
      ]);
    }
  };

  const handleCartItemQuantityChange = (itemId: string, newQuantity: number) => {
    setCartItems(
      cartItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId));
    setSelectedCartItems(selectedCartItems.filter((id) => id !== itemId));
  };

  const handleCartItemSelect = (itemId: string, selected: boolean) => {
    if (selected) {
      setSelectedCartItems([...selectedCartItems, itemId]);
    } else {
      setSelectedCartItems(selectedCartItems.filter((id) => id !== itemId));
    }
  };

  const cartTotal = cartItems
    .filter((item) => selectedCartItems.includes(item.id))
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Promotion Banner */}
      {showBanner && (
        <PromotionBanner
          message="🎉 Free shipping on orders over $100!"
          background="gradient"
          closeable
          onClose={() => setShowBanner(false)}
          style={{ marginBottom: '24px' }}
        />
      )}

      <Title level={2}>Figma Practice Components - E-Commerce Demo</Title>
      <Text type="secondary">
        This page demonstrates real-world integration of all FigmaPractice components
      </Text>

      <Divider />

      <Row gutter={[24, 24]}>
        {/* Left Column - Product Catalog */}
        <Col xs={24} lg={16}>
          <Card>
            {/* Search Bar */}
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              placeholder="Search products..."
              variant="rounded"
              size="large"
              showClearButton
              style={{ marginBottom: '24px' }}
            />

            {/* Category Tabs */}
            <CategoryTabs
              categories={categories}
              selected={selectedCategory}
              onSelect={handleCategoryChange}
              variant="pills"
              fullWidth
              style={{ marginBottom: '24px' }}
            />

            {/* Product Grid */}
            <Row gutter={[16, 16]}>
              {products
                .filter((product) =>
                  searchQuery
                    ? product.name.toLowerCase().includes(searchQuery.toLowerCase())
                    : true
                )
                .map((product) => (
                  <Col xs={24} sm={12} md={8} key={product.id}>
                    <ProductCard
                      id={product.id}
                      name={product.name}
                      price={product.price}
                      icon={product.icon}
                      colorTheme={product.colorTheme}
                      showHeart
                      showShoppingCart
                    />

                    <Card
                      size="small"
                      style={{ marginTop: '12px' }}
                      bodyStyle={{ padding: '12px' }}
                    >
                      {/* Color Selector */}
                      <ColorSelector
                        colors={product.colors}
                        selected={selectedColors[product.id]}
                        onColorChange={(colorId) =>
                          setSelectedColors({ ...selectedColors, [product.id]: colorId })
                        }
                        size="small"
                        showLabel={false}
                        style={{ marginBottom: '12px' }}
                      />

                      {/* Quantity Selector */}
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <QuantitySelector
                          quantity={quantities[product.id] || 1}
                          onChange={(qty) =>
                            setQuantities({ ...quantities, [product.id]: qty })
                          }
                          min={1}
                          max={10}
                          size="small"
                          variant="rounded"
                          showLabel={false}
                        />

                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => handleAddToCart(product.id)}
                        >
                          Add to Cart
                        </Button>
                      </Space>
                    </Card>
                  </Col>
                ))}
            </Row>
          </Card>
        </Col>

        {/* Right Column - Shopping Cart */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                🛒 Shopping Cart
                <Badge count={cartItems.length} showZero />
              </Space>
            }
            extra={
              <IconButton
                icon="🗑️"
                variant="ghost"
                size="small"
                tooltip="Clear cart"
                onClick={() => {
                  setCartItems([]);
                  setSelectedCartItems([]);
                }}
              />
            }
          >
            {cartItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">Your cart is empty</Text>
              </div>
            ) : (
              <>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {cartItems.map((item) => (
                    <CartItem
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      price={item.price}
                      quantity={item.quantity}
                      icon={item.icon}
                      color={item.selectedColor}
                      selectable
                      selected={selectedCartItems.includes(item.id)}
                      onSelectChange={(selected) =>
                        handleCartItemSelect(item.id, selected)
                      }
                      onQuantityChange={(qty) =>
                        handleCartItemQuantityChange(item.id, qty)
                      }
                      onRemove={() => handleRemoveCartItem(item.id)}
                    />
                  ))}
                </Space>

                <Divider />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}
                >
                  <Text strong>Total ({selectedCartItems.length} items):</Text>
                  <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                    ${cartTotal.toFixed(2)}
                  </Text>
                </div>

                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    disabled={selectedCartItems.length === 0}
                  >
                    Checkout
                  </Button>
                  <Button variant="outline" size="large" fullWidth>
                    Continue Shopping
                  </Button>
                </Space>
              </>
            )}
          </Card>

          {/* Action Buttons Demo */}
          <Card
            title="Icon Button Actions"
            style={{ marginTop: '16px' }}
            size="small"
          >
            <Space wrap>
              <IconButton icon="❤️" variant="primary" tooltip="Favorites" />
              <IconButton icon="🔔" variant="outline" tooltip="Notifications" />
              <IconButton icon="⚙️" variant="ghost" tooltip="Settings" />
              <IconButton icon="📤" variant="secondary" tooltip="Share" />
              <IconButton icon="🗑️" variant="danger" tooltip="Delete" />
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FigmaPracticeDemo;
