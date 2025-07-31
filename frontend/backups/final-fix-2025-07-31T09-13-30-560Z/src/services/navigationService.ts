import api from './api';
import { 
  MenuItem, 
  MenuItemRequest, 
  MenuGroup, 
  RouteConfig, 
  MenuPermission, 
  NavigationConfig 
} from '../types/navigation';

class NavigationService {
  // 菜单项管理
  async getMenuItems(): Promise<MenuItem[]> {
    const response = await api.get('/system/menu-items');
    return response.data?.data || response.data || [];
  }

  async getMenuItem(id: string): Promise<MenuItem> {
    const response = await api.get(`/system/menu-items/${id}`);
    return response.data?.data || response.data;
  }

  async createMenuItem(menuItem: MenuItemRequest): Promise<MenuItem> {
    const response = await api.post('/system/menu-items', menuItem);
    return response.data?.data || response.data;
  }

  async updateMenuItem(id: string, menuItem: Partial<MenuItemRequest>): Promise<MenuItem> {
    const response = await api.put(`/system/menu-items/${id}`, menuItem);
    return response.data?.data || response.data;
  }

  async deleteMenuItem(id: string): Promise<void> {
    await api.delete(`/system/menu-items/${id}`);
  }

  async reorderMenuItems(items: { id: string; sort_order: number }[]): Promise<void> {
    await api.post('/system/menu-items/reorder', { items });
  }

  // 菜单分组管理
  async getMenuGroups(): Promise<MenuGroup[]> {
    const response = await api.get('/system/menu-groups');
    return response.data?.data || response.data || [];
  }

  async createMenuGroup(group: Omit<MenuGroup, 'id' | 'created_at' | 'updated_at' | 'menu_items'>): Promise<MenuGroup> {
    const response = await api.post('/system/menu-groups', group);
    return response.data?.data || response.data;
  }

  async updateMenuGroup(id: string, group: Partial<MenuGroup>): Promise<MenuGroup> {
    const response = await api.put(`/system/menu-groups/${id}`, group);
    return response.data?.data || response.data;
  }

  async deleteMenuGroup(id: string): Promise<void> {
    await api.delete(`/system/menu-groups/${id}`);
  }

  // 路由配置管理
  async getRoutes(): Promise<RouteConfig[]> {
    const response = await api.get('/system/routes');
    return response.data?.data || response.data || [];
  }

  async getRoute(id: string): Promise<RouteConfig> {
    const response = await api.get(`/system/routes/${id}`);
    return response.data?.data || response.data;
  }

  async createRoute(route: Omit<RouteConfig, 'id' | 'created_at' | 'updated_at'>): Promise<RouteConfig> {
    const response = await api.post('/system/routes', route);
    return response.data?.data || response.data;
  }

  async updateRoute(id: string, route: Partial<RouteConfig>): Promise<RouteConfig> {
    const response = await api.put(`/system/routes/${id}`, route);
    return response.data?.data || response.data;
  }

  async deleteRoute(id: string): Promise<void> {
    await api.delete(`/system/routes/${id}`);
  }

  // 权限管理
  async getMenuPermissions(): Promise<MenuPermission[]> {
    const response = await api.get('/system/menu-permissions');
    return response.data?.data || response.data || [];
  }

  async updateMenuPermission(menuItemId: string, permissions: Partial<MenuPermission>[]): Promise<void> {
    await api.post(`/system/menu-items/${menuItemId}/permissions`, { permissions });
  }

  // 完整配置管理
  async getNavigationConfig(): Promise<NavigationConfig> {
    const response = await api.get('/system/navigation-config');
    return response.data?.data || response.data;
  }

  async updateNavigationConfig(config: Partial<NavigationConfig>): Promise<void> {
    await api.post('/system/navigation-config', config);
  }

  // 导入导出
  async exportNavigationConfig(): Promise<NavigationConfig> {
    const response = await api.get('/system/navigation-config/export');
    return response.data?.data || response.data;
  }

  async importNavigationConfig(config: NavigationConfig): Promise<void> {
    await api.post('/system/navigation-config/import', config);
  }

  // 预览和测试
  async previewNavigation(): Promise<MenuItem[]> {
    const response = await api.get('/system/navigation-config/preview');
    return response.data?.data || response.data || [];
  }

  async validateRoutes(): Promise<{ valid: boolean; errors: string[] }> {
    const response = await api.post('/system/routes/validate');
    return response.data?.data || response.data;
  }

  // 应用配置
  async applyNavigationConfig(): Promise<void> {
    await api.post('/system/navigation-config/apply');
  }

  async revertNavigationConfig(): Promise<void> {
    await api.post('/system/navigation-config/revert');
  }

  // 获取当前用户的菜单（根据权限过滤）
  async getUserNavigation(): Promise<MenuItem[]> {
    const response = await api.get('/navigation/user-menu');
    return response.data?.data || response.data || [];
  }

  // 批量操作
  async batchUpdateMenuItems(updates: { id: string; data: Partial<MenuItemRequest> }[]): Promise<void> {
    await api.post('/system/menu-items/batch-update', { updates });
  }

  async batchDeleteMenuItems(ids: string[]): Promise<void> {
    await api.delete('/system/menu-items/batch-delete', { data: { ids } });
  }

  // 搜索和过滤
  async searchMenuItems(query: string, filters?: {
    is_visible?: boolean;
    is_enabled?: boolean;
    parent_id?: string;
  }): Promise<MenuItem[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await api.get(`/system/menu-items/search?${params}`);
    return response.data?.data || response.data || [];
  }

  // 菜单项移动
  async moveMenuItem(id: string, newParentId: string | null, position: number): Promise<void> {
    await api.post(`/system/menu-items/${id}/move`, {
      new_parent_id: newParentId,
      position
    });
  }

  // 获取菜单统计信息
  async getNavigationStats(): Promise<{
    total_items: number;
    visible_items: number;
    enabled_items: number;
    total_groups: number;
    total_routes: number;
  }> {
    const response = await api.get('/system/navigation-config/stats');
    return response.data?.data || response.data;
  }
}

export const navigationService = new NavigationService();