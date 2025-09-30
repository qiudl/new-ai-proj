// 全局样式模块声明，允许在 TypeScript 中直接导入 CSS/SCSS/LESS 等文件
// 放在 frontend/src 下，确保被 frontend/tsconfig.json 的 include ("src/**/*") 覆盖

declare module '*.css';
declare module '*.scss';
declare module '*.sass';
declare module '*.less';

// 如果项目中使用 CSS Modules（文件名形如 *.module.css），可以导出类名映射：
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.less' {
  const classes: { [key: string]: string };
  export default classes;
}
