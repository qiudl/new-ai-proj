/**
 * Lexical 编辑器导出
 */

export { default } from './LexicalEditor';
export type { LexicalEditorProps } from './LexicalEditor';
export { default as LexicalViewer } from './LexicalViewer';
export type { LexicalViewerProps } from './LexicalViewer';
export { INSERT_IMAGE_COMMAND } from './plugins/ImagesPlugin';
export { $createImageNode, $isImageNode } from './nodes/ImageNode';
export type { ImagePayload } from './nodes/ImageNode';
