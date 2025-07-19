import React, { useState, useEffect } from 'react';
import { Select, Spin } from 'antd';
import { projectService } from '../services/projectService';
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectService.getProjects();
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (projectId: number) => {
    const selectedProject = projects.find(p => p.id === projectId);
    onChange(projectId, selectedProject);
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
      filterOption={(input, option) =>
        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
      }
      options={projects.map(project => ({
        value: project.id,
        label: project.name,
        key: project.id
      }))}
      notFoundContent={loading ? <Spin size="small" /> : '暂无项目'}
    />
  );
};

export default ProjectSelector;