import { useState, useCallback, useMemo, useEffect } from 'react';
import { Form, message } from 'antd';
import {
  User,
  UserType,
  UserRole,
  UserCreateRequest,
  UserUpdateRequest,
  getValidRolesForUserType,
  validateUserRole
} from '../types/user';
import userManagementService from '../services/userManagementService';

export type UserFormMode = 'create' | 'edit';

interface UseUserFormOptions {
  mode: UserFormMode;
  user?: User;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const useUserForm = ({ mode, user, onSuccess, onCancel }: UseUserFormOptions) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<UserType>(user?.user_type || 'system');

  // 根据用户类型获取可用角色
  const availableRoles = useMemo(() => {
    return getValidRolesForUserType(userType);
  }, [userType]);

  // 初始化表单数据（编辑模式）
  useEffect(() => {
    if (mode === 'edit' && user) {
      form.setFieldsValue({
        user_type: user.user_type,
        username: user.username,
        email: user.email,
        role: user.role,
        enterprise_id: user.enterprise_id,
        profile: {
          name: user.profile?.name || '',
          phone: user.profile?.phone || '',
          department: user.profile?.department || ''
        }
      });
      setUserType(user.user_type);
    }
  }, [mode, user, form]);

  // 处理用户类型变更
  const handleUserTypeChange = useCallback((newUserType: UserType) => {
    setUserType(newUserType);

    // 清空角色选择（因为不同用户类型有不同的角色）
    form.setFieldValue('role', undefined);

    // 清空企业选择（如果切换到系统用户）
    if (newUserType === 'system') {
      form.setFieldValue('enterprise_id', undefined);
    }

    // 强制验证角色字段
    form.validateFields(['role']).catch(() => {});
  }, [form]);

  // 表单提交
  const handleSubmit = useCallback(async (values: any) => {
    try {
      setLoading(true);

      // 验证角色是否与用户类型匹配
      if (!validateUserRole(values.user_type, values.role)) {
        message.error('所选角色与用户类型不匹配');
        return;
      }

      if (mode === 'create') {
        // 创建用户
        const createData: UserCreateRequest = {
          username: values.username,
          email: values.email,
          password: values.password,
          user_type: values.user_type,
          role: values.role,
          enterprise_id: values.user_type === 'company' ? values.enterprise_id : undefined,
          profile: values.profile
        };

        await userManagementService.createUser(createData);
        message.success('用户创建成功');
      } else {
        // 更新用户
        const updateData: UserUpdateRequest = {
          username: values.username,
          email: values.email,
          user_type: values.user_type,
          role: values.role,
          enterprise_id: values.user_type === 'company' ? values.enterprise_id : undefined,
          profile: values.profile
        };

        await userManagementService.updateUser(user!.id, updateData);
        message.success('用户更新成功');
      }

      // 重置表单
      form.resetFields();

      // 调用成功回调
      onSuccess?.();
    } catch (error: any) {
      console.error(`${mode === 'create' ? '创建' : '更新'}用户失败:`, error);
      message.error(error.message || `${mode === 'create' ? '创建' : '更新'}用户失败`);
    } finally {
      setLoading(false);
    }
  }, [mode, user, form, onSuccess]);

  // 取消操作
  const handleCancel = useCallback(() => {
    form.resetFields();
    onCancel?.();
  }, [form, onCancel]);

  // 重置表单
  const resetForm = useCallback(() => {
    form.resetFields();
    setUserType('system');
  }, [form]);

  return {
    form,
    loading,
    userType,
    availableRoles,
    handleUserTypeChange,
    handleSubmit,
    handleCancel,
    resetForm
  };
};
