# Product Management System - Complete Guide

## Overview

The Product Management System is a comprehensive solution for managing product catalogs, inventory, and stock operations. It follows a two-tier product model (SPU/SKU) commonly used in e-commerce platforms.

**Version**: 1.0.0
**Last Updated**: November 2025
**Author**: AI Project Team

---

## Table of Contents

1. [Architecture](#architecture)
2. [Core Concepts](#core-concepts)
3. [Data Models](#data-models)
4. [API Reference](#api-reference)
5. [Frontend Components](#frontend-components)
6. [Usage Examples](#usage-examples)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────┐           │
│  │ SPUList  │  │ SKUList  │  │  InventoryPage  │           │
│  │   Page   │  │   Page   │  │   (2 tabs)      │           │
│  └────┬─────┘  └────┬─────┘  └────────┬────────┘           │
│       │             │                  │                     │
│       └─────────────┴──────────────────┘                     │
│                     │                                         │
│            ┌────────▼────────┐                               │
│            │ productService  │                               │
│            │  (API Client)   │                               │
│            └────────┬────────┘                               │
└─────────────────────┼──────────────────────────────────────┘
                      │ HTTP/REST
┌─────────────────────┼──────────────────────────────────────┐
│                     │        Backend (Go/Gin)               │
│            ┌────────▼────────┐                               │
│            │   API Routes    │                               │
│            └────────┬────────┘                               │
│                     │                                         │
│       ┌─────────────┼─────────────┐                          │
│       │             │             │                          │
│  ┌────▼─────┐  ┌───▼────┐  ┌────▼────────┐                 │
│  │   SPU    │  │  SKU   │  │  Inventory  │                 │
│  │ Handler  │  │ Handler│  │  Handler    │                 │
│  └────┬─────┘  └───┬────┘  └────┬────────┘                 │
│       │            │             │                          │
│  ┌────▼─────┐  ┌───▼────┐  ┌────▼────────┐                 │
│  │   SPU    │  │  SKU   │  │  Inventory  │                 │
│  │Repository│  │Repository  │ Repository  │                │
│  └────┬─────┘  └───┬────┘  └────┬────────┘                 │
│       │            │             │                          │
└───────┼────────────┼─────────────┼─────────────────────────┘
        │            │             │
        └────────────┴─────────────┘
                     │
           ┌─────────▼─────────┐
           │   PostgreSQL      │
           │   (Database)      │
           └───────────────────┘
```

### Technology Stack

**Backend**:
- Go 1.24.0
- Gin Web Framework
- GORM ORM
- PostgreSQL 16

**Frontend**:
- React 18.2.0
- TypeScript 5.3.3
- Ant Design 5.6.1
- React Query (TanStack Query v5)

**Testing**:
- Backend: Go testing package, testify, SQLite (in-memory)
- Frontend: Jest, React Testing Library
- E2E: Playwright
- Integration: Axios + Jest

---

## Core Concepts

### 1. SPU (Standard Product Unit)

**Definition**: A product family or category that groups related products.

**Example**: "iPhone 15" is an SPU that can have multiple variants.

**Key Characteristics**:
- Unique SPU code
- Common attributes (brand, description, category)
- Can have multiple SKUs
- Manages product-level information

**Use Cases**:
- Product catalog browsing
- Brand management
- Category organization
- Marketing campaigns

### 2. SKU (Stock Keeping Unit)

**Definition**: A specific variant of an SPU with unique attributes.

**Example**: "iPhone 15 Blue 128GB" is a SKU under the "iPhone 15" SPU.

**Key Characteristics**:
- Unique SKU code
- Specific attributes (color, size, storage, etc.)
- Independent pricing
- Individual stock tracking
- Belongs to exactly one SPU

**Use Cases**:
- Inventory management
- Order fulfillment
- Price management
- Stock alerts

### 3. Inventory Management

**Definition**: System for tracking and managing stock levels of SKUs.

**Key Operations**:

1. **入库 (Inventory In)**:
   - Add stock to warehouse
   - Increases available quantity
   - Tracks source (purchase, return, transfer)

2. **出库 (Inventory Out)**:
   - Remove stock from warehouse
   - Decreases available quantity
   - Tracks destination (order, loss, transfer)

3. **盘点 (Stock Adjustment)**:
   - Correct inventory discrepancies
   - Set exact quantity
   - Requires reason/explanation

4. **锁定 (Lock)**:
   - Reserve stock for orders
   - Moves from available to locked
   - Prevents overselling

5. **解锁 (Unlock)**:
   - Release reserved stock
   - Moves from locked to available
   - Used when orders are cancelled

**Inventory States**:
- **Available Quantity**: Stock ready for sale
- **Locked Quantity**: Stock reserved for orders
- **Total Quantity**: Available + Locked

---

## Data Models

### SPU Model

```go
type SPU struct {
    ID          uint      `json:"id"`
    SPUCode     string    `json:"spu_code"`      // Unique identifier
    Name        string    `json:"name"`          // Product name
    Brand       string    `json:"brand"`         // Brand name
    Category    string    `json:"category"`      // Product category
    Description string    `json:"description"`   // Detailed description
    Images      []string  `json:"images"`        // Product images
    Status      string    `json:"status"`        // active/inactive
    EnterpriseID uint     `json:"enterprise_id"` // Multi-tenant
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

**Business Rules**:
- `spu_code` must be unique within an enterprise
- `status` can be "active" or "inactive"
- Deleting an SPU soft-deletes all related SKUs
- Brand and category are optional but recommended

### SKU Model

```go
type SKU struct {
    ID            uint          `json:"id"`
    SKUCode       string        `json:"sku_code"`         // Unique identifier
    SPUID         uint          `json:"spu_id"`           // Parent SPU
    Name          string        `json:"name"`             // Variant name
    Price         float64       `json:"price"`            // Selling price
    CostPrice     *float64      `json:"cost_price"`       // Cost (optional)
    MarketPrice   *float64      `json:"market_price"`     // MSRP (optional)
    StockQuantity int           `json:"stock_quantity"`   // Current stock
    AlertQuantity int           `json:"alert_quantity"`   // Low stock threshold
    Attributes    SKUAttributes `json:"attributes"`       // Key-value pairs
    Barcode       string        `json:"barcode"`          // Barcode (optional)
    Weight        *float64      `json:"weight"`           // Weight in kg
    Volume        *float64      `json:"volume"`           // Volume in m³
    Status        string        `json:"status"`           // active/inactive
    CreatedAt     time.Time     `json:"created_at"`
    UpdatedAt     time.Time     `json:"updated_at"`
}

type SKUAttributes map[string]string // e.g., {"color": "Blue", "size": "L"}
```

**Business Rules**:
- `sku_code` must be globally unique
- `price` must be >= 0
- `stock_quantity` must be >= 0
- `alert_quantity` defaults to 10
- Low stock alert triggers when `stock_quantity <= alert_quantity`

### Inventory Models

```go
type InventoryRecord struct {
    ID                uint       `json:"id"`
    SKUID             uint       `json:"sku_id"`
    WarehouseID       *uint      `json:"warehouse_id"`      // Optional
    AvailableQuantity int        `json:"available_quantity"` // Ready to sell
    LockedQuantity    int        `json:"locked_quantity"`    // Reserved
    TotalQuantity     int        `json:"total_quantity"`     // Auto-calculated
    LastInDate        *time.Time `json:"last_in_date"`
    LastOutDate       *time.Time `json:"last_out_date"`
    LastCheckDate     *time.Time `json:"last_check_date"`
    UpdatedAt         time.Time  `json:"updated_at"`
}

type InventoryTransaction struct {
    ID              uint      `json:"id"`
    SKUID           uint      `json:"sku_id"`
    TransactionType string    `json:"transaction_type"` // in/out/adjust/lock/unlock
    Quantity        int       `json:"quantity"`         // Positive or negative
    BeforeQuantity  int       `json:"before_quantity"`
    AfterQuantity   int       `json:"after_quantity"`
    OperatorID      *uint     `json:"operator_id"`
    Reason          string    `json:"reason"`
    ReferenceType   string    `json:"reference_type"`   // order/purchase/manual
    ReferenceID     *uint     `json:"reference_id"`
    CreatedAt       time.Time `json:"created_at"`
}
```

**Transaction Types**:
- `in`: Inventory in (quantity > 0)
- `out`: Inventory out (quantity < 0)
- `adjust`: Stock adjustment (can be + or -)
- `lock`: Lock stock (available → locked)
- `unlock`: Unlock stock (locked → available)
- `return`: Product return (quantity > 0)

---

## API Reference

### SPU Endpoints

#### Create SPU
```
POST /api/v1/products/spu
```

**Request Body**:
```json
{
  "spu_code": "SPU-001",
  "name": "iPhone 15",
  "brand": "Apple",
  "category": "Smartphones",
  "description": "Latest iPhone model",
  "images": ["image1.jpg", "image2.jpg"],
  "status": "active"
}
```

**Response**: `201 Created`
```json
{
  "id": 1,
  "spu_code": "SPU-001",
  "name": "iPhone 15",
  ...
}
```

#### List SPUs (with stats)
```
GET /api/v1/products/spu/stats?page=1&page_size=10&search=iPhone&status=active
```

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "spu_code": "SPU-001",
      "name": "iPhone 15",
      "sku_count": 12,
      "total_stock": 500,
      ...
    }
  ],
  "total": 50,
  "page": 1,
  "page_size": 10
}
```

#### Get SPU Detail
```
GET /api/v1/products/spu/:id/detail
```

**Response**: `200 OK` - Includes SKUs list

#### Update SPU
```
PUT /api/v1/products/spu/:id
```

#### Delete SPU
```
DELETE /api/v1/products/spu/:id
```
*Note: Soft delete, cascades to SKUs*

### SKU Endpoints

#### Create SKU
```
POST /api/v1/products/sku
```

**Request Body**:
```json
{
  "sku_code": "SKU-001",
  "spu_id": 1,
  "name": "Blue 128GB",
  "price": 999.99,
  "cost_price": 700.00,
  "stock_quantity": 100,
  "alert_quantity": 10,
  "attributes": {
    "color": "Blue",
    "storage": "128GB"
  },
  "status": "active"
}
```

#### Batch Create SKUs
```
POST /api/v1/products/sku/batch
```

**Request Body**:
```json
{
  "spu_id": 1,
  "skus": [
    { "sku_code": "SKU-001", "name": "Red-L", "price": 199.99, ... },
    { "sku_code": "SKU-002", "name": "Blue-M", "price": 189.99, ... }
  ]
}
```

#### Batch Update SKUs
```
PUT /api/v1/products/sku/batch
```

**Request Body**:
```json
{
  "updates": [
    { "id": 1, "price": 249.99, "stock_quantity": 150 },
    { "id": 2, "price": 239.99 }
  ]
}
```

#### List SKUs (with details)
```
GET /api/v1/products/sku/details?keyword=Blue&low_stock=true&page=1&page_size=10
```

### Inventory Endpoints

#### Inventory In
```
POST /api/v1/products/inventory/in
```

**Request Body**:
```json
{
  "sku_id": 1,
  "quantity": 100,
  "warehouse_id": 1,
  "reason": "Purchase Order #12345",
  "reference_type": "purchase",
  "reference_id": 12345
}
```

#### Inventory Out
```
POST /api/v1/products/inventory/out
```

#### Inventory Adjust
```
POST /api/v1/products/inventory/adjust
```

**Request Body**:
```json
{
  "sku_id": 1,
  "warehouse_id": 1,
  "new_quantity": 150,
  "reason": "Monthly stock check"
}
```

#### Lock Inventory
```
POST /api/v1/products/inventory/lock
```

#### Unlock Inventory
```
POST /api/v1/products/inventory/unlock
```

#### List Inventory Records
```
GET /api/v1/products/inventory/records?sku_id=1&low_stock=true&page=1&page_size=10
```

#### Get Transaction History
```
GET /api/v1/products/inventory/transactions?sku_id=1&transaction_type=in&start_date=2025-01-01&end_date=2025-01-31
```

---

## Frontend Components

### SPUListPage

**Location**: `src/pages/ProductManagement/SPUListPage.tsx`

**Features**:
- Paginated SPU list with search
- Status filtering (active/inactive)
- Brand filtering
- SKU count display
- Quick actions (edit, delete, view SKUs)

**State Management**:
- Local state for filters and pagination
- React Query for data fetching and caching

### SKUListPage

**Location**: `src/pages/ProductManagement/SKUListPage.tsx`

**Features**:
- Paginated SKU list with search
- Low stock highlighting
- Batch selection and editing
- Price and stock management
- Attribute tag display
- Batch edit drawer for multiple SKUs

**Key Interactions**:
- Row selection with checkboxes
- Inline editing via drawer
- Bulk price updates

### InventoryPage

**Location**: `src/pages/ProductManagement/InventoryPage.tsx`

**Features**:
- Dual-tab interface:
  1. **Inventory Records**: Current stock levels
  2. **Transaction History**: Audit trail

**Inventory Records Tab**:
- Real-time stock display (available/locked/total)
- Low stock filtering
- Quick action buttons (in/out/adjust/lock/unlock)
- Modal forms for each operation

**Transaction History Tab**:
- Filterable transaction log
- Type filtering (in/out/adjust/lock/unlock)
- Date range filtering
- SKU filtering
- Operator and reason display

---

## Usage Examples

### Example 1: Creating a Complete Product

**Step 1: Create SPU**
```typescript
const spuData: SPUCreateRequest = {
  spu_code: 'SPU-TSHIRT-001',
  name: 'Premium Cotton T-Shirt',
  brand: 'Fashion Brand',
  category: 'Apparel',
  description: 'High-quality cotton t-shirt',
  status: 'active'
};

const spu = await productService.createSPU(spuData);
```

**Step 2: Create SKUs (different sizes and colors)**
```typescript
const skus = await productService.batchCreateSKUs({
  spu_id: spu.id,
  skus: [
    {
      sku_code: 'SKU-TSHIRT-RED-S',
      spu_id: spu.id,
      name: 'Red-Small',
      price: 29.99,
      stock_quantity: 0,
      attributes: { color: 'Red', size: 'S' },
      status: 'active'
    },
    {
      sku_code: 'SKU-TSHIRT-RED-M',
      spu_id: spu.id,
      name: 'Red-Medium',
      price: 29.99,
      stock_quantity: 0,
      attributes: { color: 'Red', size: 'M' },
      status: 'active'
    },
    // ... more variants
  ]
});
```

**Step 3: Stock In**
```typescript
// Receive 100 units of each SKU
for (const sku of skus.skus) {
  await productService.inventoryIn({
    sku_id: sku.id,
    quantity: 100,
    reason: 'Initial stock from supplier'
  });
}
```

### Example 2: Order Fulfillment Workflow

```typescript
// 1. Customer places order - lock inventory
await productService.lockInventory({
  sku_id: 123,
  quantity: 2,
  reason: 'Order #12345'
});

// 2. Payment confirmed - ship and deduct from locked
await productService.inventoryOut({
  sku_id: 123,
  quantity: 2,
  reason: 'Order #12345 shipped',
  reference_type: 'order',
  reference_id: 12345
});

// 3. If order cancelled - unlock
await productService.unlockInventory({
  sku_id: 123,
  quantity: 2,
  reason: 'Order #12345 cancelled'
});
```

### Example 3: Monthly Stock Check

```typescript
// Get current inventory
const inventory = await productService.getSKUInventory(skuId);

// Physical count reveals discrepancy
const physicalCount = 95;

// Adjust to actual count
await productService.adjustInventory({
  sku_id: skuId,
  new_quantity: physicalCount,
  reason: 'Monthly stock check - found 5 units missing'
});
```

---

## Testing

### Backend Unit Tests

**Location**: `backend/database/*_repository_test.go`

**Run Tests**:
```bash
cd backend
go test -v ./database -run "Test(SPU|SKU|Inventory)Repository"
```

**Coverage**:
- 38 tests total (13 SPU + 14 SKU + 11 Inventory)
- CRUD operations
- Batch operations
- Filtering and pagination
- Transaction integrity

### Frontend Component Tests

**Location**: `frontend/src/pages/ProductManagement/__tests__/*.test.tsx`

**Run Tests**:
```bash
cd frontend
npm test -- --testPathPattern="ProductManagement/__tests__"
```

**Coverage**:
- 39 tests total across 3 pages
- User interactions
- Form validation
- Error handling
- Data display

### Integration Tests

**Location**: `frontend/src/services/__tests__/productService.integration.test.ts`

**Run Tests**:
```bash
# Ensure backend is running
npm test -- productService.integration.test.ts
```

**Coverage**:
- 29 API integration tests
- End-to-end API workflows
- Error scenarios
- Data validation

### E2E Tests

**Location**: `frontend/e2e/product-management.spec.ts`

**Run Tests**:
```bash
npx playwright test product-management
```

**Coverage**:
- 21 E2E test scenarios
- Complete user workflows
- Cross-page interactions
- Error handling UI

---

## Troubleshooting

### Common Issues

#### 1. "SKU code already exists"
**Problem**: Attempting to create SKU with duplicate code
**Solution**: SKU codes must be globally unique. Check existing SKUs or use a different code.

#### 2. "Insufficient stock"
**Problem**: Trying to ship more than available quantity
**Solution**:
- Check available vs. locked inventory
- Unlock reserved stock if orders are cancelled
- Adjust inventory if physical count differs

#### 3. "Cannot delete SPU with active SKUs"
**Problem**: SPU has associated SKUs
**Solution**: Either delete SKUs first, or use soft delete which handles this automatically.

#### 4. Low Stock Alerts Not Showing
**Problem**: SKUs not flagged as low stock
**Solution**:
- Verify `alert_quantity` is set correctly
- Check that `stock_quantity <= alert_quantity`
- Refresh the SKU list page

#### 5. Transaction History Missing
**Problem**: Inventory operations not appearing in history
**Solution**:
- Verify the operation completed successfully
- Check date range filters
- Clear any active filters

### Performance Tips

1. **Use Batch Operations**: Create/update multiple SKUs in one request
2. **Enable Caching**: React Query automatically caches list data
3. **Limit Page Size**: Use reasonable page sizes (10-50) for large datasets
4. **Index Fields**: Ensure `spu_code`, `sku_code` are indexed in database
5. **Archive Old Data**: Regularly archive old transactions to improve query speed

### Debug Mode

Enable detailed logging:
```bash
# Backend
LOG_LEVEL=debug go run main.go

# Frontend
REACT_APP_DEBUG=true npm start
```

---

## Appendix

### Database Schema

See migration files in `backend/migrations/202510_28_01_product_management/`

### Swagger API Documentation

Access at: `http://localhost:8080/swagger/index.html` (when backend is running)

### Contributing

See main project `CONTRIBUTING.md` for guidelines.

---

**Document Version**: 1.0.0
**Last Updated**: November 7, 2025
**Maintained By**: AI Project Team
