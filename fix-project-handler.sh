#!/bin/bash

# 备份原文件
cp backend/main.go backend/main.go.backup

# 替换项目处理器中的代码
sed -i '' 's/projects, total, err := app\.db\.Projects()\.List(c\.Request\.Context(), pagination\.PageSize, offset)/projectsWithCompany, total, err := app\.db\.Projects()\.ListWithCompanyInfo(c\.Request\.Context(), pagination\.PageSize, offset)/' backend/main.go
sed -i '' 's/app\.logger\.Printf("Error getting projects: %v", err)/app\.logger\.Printf("Error getting projects with company info: %v", err)/' backend/main.go
sed -i '' 's/projectResponses := make(\[\]models\.ProjectResponse, len(projects))/projectResponses := make(\[\]models\.ProjectResponse, len(projectsWithCompany))/' backend/main.go
sed -i '' 's/for i, project := range projects {/for i, projectWithCompany := range projectsWithCompany {/' backend/main.go
sed -i '' 's/projectResponses\[i\] = project\.ToResponse()/projectResponses\[i\] = projectWithCompany\.ToResponse()/' backend/main.go

echo "项目处理器修复完成"
echo "原文件备份为 backend/main.go.backup"
