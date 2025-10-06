import { useState, useMemo } from 'react';
import { DocumentTemplate, DocumentTemplateType } from '../types';
import { DOCUMENT_TEMPLATES } from '../constants';

/**
 * 模板筛选Hook
 */
export const useTemplateFilter = () => {
  const [searchText, setSearchText] = useState('');

  // 所有模板列表
  const allTemplates = useMemo(() => {
    return Object.values(DOCUMENT_TEMPLATES);
  }, []);

  // 筛选后的模板列表
  const filteredTemplates = useMemo(() => {
    if (!searchText.trim()) {
      return allTemplates;
    }

    const lowerSearch = searchText.toLowerCase();
    return allTemplates.filter((template) => {
      return (
        template.name.toLowerCase().includes(lowerSearch) ||
        template.description.toLowerCase().includes(lowerSearch) ||
        template.type.toLowerCase().includes(lowerSearch)
      );
    });
  }, [searchText, allTemplates]);

  return {
    searchText,
    setSearchText,
    allTemplates,
    filteredTemplates,
  };
};
