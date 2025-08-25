import React, { useState, useEffect } from 'react';
import { Select, Spin, Empty } from 'antd';
import { ProjectOutlined } from '@ant-design/icons';
import { projectService, ProjectOption } from '../services/projectService';
import { Project } from '../types/project';

interface ProjectSelectorProps {
  value?: number;
  onChange: (projectId: number, project?: Project) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  allowClear?: boolean;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  value,
  onChange,
  placeholder = "请选择项目",
  style,
  allowClear = false
}) => {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      // 首选：使用精简接口，仅获取 id 和 name
      const options = await projectService.getProjectsForDocumentMetadata();
      setProjects(Array.isArray(options) ? options : []);
    } catch (error) {
      console.error('Failed to load projects (metadata endpoint):', error);
      // 兜底：使用分页项目列表，仅提取 id 和 name
      try {
        const resp = await projectService.getProjects({ page: 1, pageSize: 100 });
        const items = Array.isArray(resp?.data) ? resp.data : [];
        setProjects(items.map((p: any) => ({ id: p.id, name: p.name })));
      } catch (e2) {
        console.error('Fallback loading projects failed:', e2);
        setProjects([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (projectId: number) => {
    const selectedProject = projects.find(p => p.id === projectId);
    // 维持对外类型兼容，最小化返回值（仅 id/name）
    onChange(projectId, selectedProject as unknown as Project);
  };

  return (
    <Select
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      style={style}
      loading={loading}
      allowClear={allowClear}
      showSearch
      size="large"
      filterOption={(input, option) =>
        (option?.searchText ?? '').toLowerCase().includes(input.toLowerCase())
      }
      options={projects.map(project => ({
        value: project.id,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ProjectOutlined style={{ color: '#1890ff' }} />
            <div>
              <div style={{ fontWeight: 500 }}>{project.name}</div>
              {project.description && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#8c8c8c',
                  marginTop: '2px',
                  lineHeight: '1.2'
                }}>
                  {project.description.length > 40 
                    ? `${project.description.substring(0, 40)}...` 
                    : project.description
                  }
                </div>
              )}
            </div>
          </div>
        ),
        searchText: `${project.name} ${project.description || ''}`,
        key: project.id
      }))}
      notFoundContent={
        loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="small" />
            <div style={{ marginTop: '8px', color: '#8c8c8c' }}>加载中...</div>
          </div>
        ) : (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无项目"
            style={{ padding: '20px' }}
          />
        )
      }
      styles={{
        popup: {
          root: {
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }
        }
      }}
    />
  );
};

export default ProjectSelector;
