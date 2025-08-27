import React, { useMemo, useState } from 'react';
import { Card, Descriptions, Divider, Transfer, Typography } from 'antd';

interface CompanyRoleManagementProps {
  onRoleUpdate?: () => void;
}

// 简单的角色项类型（与 antd Transfer 兼容）
interface RoleItem {
  key: string;
  title: string;
  disabled?: boolean;
}

// 选中用户的最小字段定义（可按需扩展/替换为真实类型）
interface SelectedUser {
  display_name: string;
  company_name: string;
}

const CompanyRoleManagement: React.FC<CompanyRoleManagementProps> = ({ onRoleUpdate }) => {
  // 示例数据与状态（根据实际业务对接 API 替换）
  const [selectedUser] = useState<SelectedUser | null>(null);
  const [transferDataSource] = useState<RoleItem[]>([
    { key: 'role_admin', title: '企业管理员' },
    { key: 'role_user', title: '企业普通用户' },
  ]);
  const [targetKeys, setTargetKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const hasUser = useMemo(() => !!selectedUser, [selectedUser]);

  return (
    <div>
      <Card title="企业角色管理" bordered>
        {!hasUser ? (
          <Typography.Text type="secondary">请选择一个用户以管理其角色</Typography.Text>
        ) : (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="名称">{selectedUser!.display_name}</Descriptions.Item>
              <Descriptions.Item label="所属企业">{selectedUser!.company_name}</Descriptions.Item>
            </Descriptions>

            <Divider />

            <Transfer
              dataSource={transferDataSource}
              titles={['可分配角色', '已分配角色']}
              targetKeys={targetKeys}
              selectedKeys={selectedKeys}
              onChange={(nextTargetKeys) => {
                setTargetKeys(nextTargetKeys as string[]);
                // 这里可触发保存事件，然后在成功后回调外部刷新
                // onRoleUpdate?.();
              }}
              onSelectChange={(sourceSelectedKeys, targetSelectedKeys) => {
                setSelectedKeys([...(sourceSelectedKeys as string[]), ...(targetSelectedKeys as string[])]);
              }}
              render={(item) => item.title}
              listStyle={{
                width: 350,
                height: 400,
              }}
              showSearch
              showSelectAll
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default CompanyRoleManagement;
