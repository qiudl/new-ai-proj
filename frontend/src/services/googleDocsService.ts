/**
 * Google Docs API集成服务
 * 提供与Google Docs的完整集成功能
 */

// Google APIs类型定义
// 导入配置
import { 
  GOOGLE_CONFIG, 
  FEATURE_FLAGS, 
  GOOGLE_DOCS_CONFIG, 
  ERROR_CONFIG,
  validateGoogleConfig 
} from '../config/googleConfig';

interface GoogleAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

interface GoogleDocsDocument {
  documentId: string;
  title: string;
  body: {
    content: Array<{
      paragraph?: {
        elements: Array<{
          textRun?: {
            content: string;
            textStyle?: any;
          };
        }>;
      };
    }>;
  };
  revisionId: string;
  createdTime: string;
  modifiedTime: string;
  permissions?: any[];
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  webContentLink?: string;
  owners: Array<{
    displayName: string;
    emailAddress: string;
  }>;
  permissions?: any[];
}

class GoogleDocsService {
  private clientId: string;
  private apiKey: string;
  private accessToken: string | null = null;
  private isGapiLoaded = false;

  constructor() {
    this.clientId = GOOGLE_CONFIG.CLIENT_ID;
    this.apiKey = GOOGLE_CONFIG.API_KEY;
    
    // 验证配置
    if (!validateGoogleConfig()) {
      console.warn('Google API configuration is incomplete. Some features may not work.');
    }
    
    // 从localStorage恢复token
    this.accessToken = localStorage.getItem('google_access_token');
  }

  /**
   * 初始化Google API
   */
  async initialize(): Promise<void> {
    if (this.isGapiLoaded) return;

    return new Promise((resolve, reject) => {
      // 加载Google API客户端库
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = async () => {
        try {
          await new Promise<void>((resolveGapi) => {
            window.gapi.load('client:auth2', resolveGapi);
          });

          await window.gapi.client.init(GOOGLE_CONFIG.GAPI_CONFIG);

          this.isGapiLoaded = true;
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * 用户认证
   */
  async authenticate(): Promise<boolean> {
    try {
      await this.initialize();
      
      const authInstance = window.gapi.auth2.getAuthInstance();
      
      if (!authInstance.isSignedIn.get()) {
        const user = await authInstance.signIn();
        const authResponse = user.getAuthResponse(true);
        this.accessToken = authResponse.access_token;
        
        // 保存token
        if (this.accessToken) {
          localStorage.setItem('google_access_token', this.accessToken);
        }
        localStorage.setItem('google_refresh_token', authResponse.refresh_token || '');
      } else {
        const user = authInstance.currentUser.get();
        const authResponse = user.getAuthResponse(true);
        this.accessToken = authResponse.access_token;
      }

      return true;
    } catch (error) {
      console.error('Google认证失败:', error);
      return false;
    }
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return !!this.accessToken && this.isGapiLoaded;
  }

  /**
   * 退出登录
   */
  async signOut(): Promise<void> {
    if (this.isGapiLoaded) {
      const authInstance = window.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
    }
    
    this.accessToken = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_refresh_token');
  }

  /**
   * 创建新的Google Docs文档
   */
  async createDocument(title: string, content?: string): Promise<GoogleDocsDocument> {
    if (!this.isAuthenticated()) {
      throw new Error('未认证，请先登录Google账户');
    }

    try {
      // 创建文档
      const response = await window.gapi.client.docs.documents.create({
        title
      });

      const documentId = response.result.documentId;

      // 如果有内容，插入内容
      if (content && documentId) {
        await this.updateDocument(documentId, content);
      }

      return await this.getDocument(documentId);
    } catch (error) {
      console.error('创建Google Docs文档失败:', error);
      throw new Error('创建文档失败');
    }
  }

  /**
   * 获取Google Docs文档
   */
  async getDocument(documentId: string): Promise<GoogleDocsDocument> {
    if (!this.isAuthenticated()) {
      throw new Error('未认证，请先登录Google账户');
    }

    try {
      const response = await window.gapi.client.docs.documents.get({
        documentId
      });

      return response.result as GoogleDocsDocument;
    } catch (error) {
      console.error('获取Google Docs文档失败:', error);
      throw new Error('获取文档失败');
    }
  }

  /**
   * 更新Google Docs文档内容
   */
  async updateDocument(documentId: string, content: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('未认证，请先登录Google账户');
    }

    try {
      // 获取当前文档以确定内容长度
      const doc = await this.getDocument(documentId);
      const endIndex = this.getDocumentEndIndex(doc);

      // 构建更新请求
      const requests = [
        // 先删除现有内容（除了第一个字符，Google Docs要求保留）
        {
          deleteContentRange: {
            range: {
              startIndex: 1,
              endIndex: endIndex
            }
          }
        },
        // 插入新内容
        {
          insertText: {
            location: {
              index: 1
            },
            text: content
          }
        }
      ];

      await window.gapi.client.docs.documents.batchUpdate({
        documentId,
        requests
      });
    } catch (error) {
      console.error('更新Google Docs文档失败:', error);
      throw new Error('更新文档失败');
    }
  }

  /**
   * 获取文档的纯文本内容
   */
  getDocumentText(doc: GoogleDocsDocument): string {
    let text = '';
    
    if (doc.body && doc.body.content) {
      for (const element of doc.body.content) {
        if (element.paragraph && element.paragraph.elements) {
          for (const paragraphElement of element.paragraph.elements) {
            if (paragraphElement.textRun && paragraphElement.textRun.content) {
              text += paragraphElement.textRun.content;
            }
          }
        }
      }
    }
    
    return text;
  }

  /**
   * 获取文档内容的结束索引
   */
  private getDocumentEndIndex(doc: GoogleDocsDocument): number {
    let endIndex = 1; // Google Docs文档至少有一个字符
    
    if (doc.body && doc.body.content) {
      const text = this.getDocumentText(doc);
      endIndex = text.length;
    }
    
    return endIndex;
  }

  /**
   * 分享文档
   */
  async shareDocument(documentId: string, email: string, role: 'reader' | 'writer' | 'commenter' = 'reader'): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('未认证，请先登录Google账户');
    }

    try {
      await window.gapi.client.drive.permissions.create({
        fileId: documentId,
        resource: {
          role,
          type: 'user',
          emailAddress: email
        },
        sendNotificationEmail: true
      });
    } catch (error) {
      console.error('分享文档失败:', error);
      throw new Error('分享文档失败');
    }
  }

  /**
   * 获取用户的Google Drive文档列表
   */
  async listDocuments(maxResults: number = 50): Promise<GoogleDriveFile[]> {
    if (!this.isAuthenticated()) {
      throw new Error('未认证，请先登录Google账户');
    }

    try {
      const response = await window.gapi.client.drive.files.list({
        q: "mimeType='application/vnd.google-apps.document' and trashed=false",
        pageSize: maxResults,
        fields: 'files(id,name,mimeType,createdTime,modifiedTime,webViewLink,owners,permissions)',
        orderBy: 'modifiedTime desc'
      });

      return response.result.files || [];
    } catch (error) {
      console.error('获取文档列表失败:', error);
      throw new Error('获取文档列表失败');
    }
  }

  /**
   * 导入Google Docs文档到本地系统
   */
  async importDocument(googleDocId: string): Promise<{
    title: string;
    content: string;
    metadata: Record<string, unknown>;
  }> {
    try {
      const doc = await this.getDocument(googleDocId);
      const content = this.getDocumentText(doc);

      return {
        title: doc.title,
        content,
        metadata: {
          googleDocId: doc.documentId,
          revisionId: doc.revisionId,
          createdTime: doc.createdTime,
          modifiedTime: doc.modifiedTime,
          source: 'google-docs'
        }
      };
    } catch (error) {
      console.error('导入Google Docs文档失败:', error);
      throw new Error('导入文档失败');
    }
  }

  /**
   * 将本地文档导出到Google Docs
   */
  async exportDocument(title: string, content: string): Promise<string> {
    try {
      const doc = await this.createDocument(title, content);
      return doc.documentId;
    } catch (error) {
      console.error('导出到Google Docs失败:', error);
      throw new Error('导出文档失败');
    }
  }

  /**
   * 获取文档的分享链接
   */
  async getShareableLink(documentId: string): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error('未认证，请先登录Google账户');
    }

    try {
      const response = await window.gapi.client.drive.files.get({
        fileId: documentId,
        fields: 'webViewLink'
      });

      return response.result.webViewLink || '';
    } catch (error) {
      console.error('获取分享链接失败:', error);
      throw new Error('获取分享链接失败');
    }
  }

  /**
   * 获取文档的修订历史
   */
  async getRevisions(documentId: string): Promise<any[]> {
    if (!this.isAuthenticated()) {
      throw new Error('未认证，请先登录Google账户');
    }

    try {
      const response = await window.gapi.client.drive.revisions.list({
        fileId: documentId,
        fields: 'revisions(id,modifiedTime,lastModifyingUser)'
      });

      return response.result.revisions || [];
    } catch (error) {
      console.error('获取文档修订历史失败:', error);
      throw new Error('获取修订历史失败');
    }
  }

  /**
   * 实时协作：获取文档的协作者信息
   */
  async getCollaborators(documentId: string): Promise<any[]> {
    if (!this.isAuthenticated()) {
      throw new Error('未认证，请先登录Google账户');
    }

    try {
      const response = await window.gapi.client.drive.permissions.list({
        fileId: documentId,
        fields: 'permissions(id,displayName,emailAddress,role,type)'
      });

      return response.result.permissions || [];
    } catch (error) {
      console.error('获取协作者信息失败:', error);
      return [];
    }
  }

  /**
   * 监听文档变更（通过轮询实现简单的实时更新）
   */
  startDocumentWatcher(documentId: string, callback: (doc: GoogleDocsDocument) => void, interval: number = 5000): () => void {
    let isWatching = true;
    let lastRevisionId = '';

    const checkForUpdates = async () => {
      if (!isWatching) return;

      try {
        const doc = await this.getDocument(documentId);
        
        if (doc.revisionId !== lastRevisionId) {
          lastRevisionId = doc.revisionId;
          callback(doc);
        }
      } catch (error) {
        console.error('检查文档更新失败:', error);
      }

      if (isWatching) {
        setTimeout(checkForUpdates, interval);
      }
    };

    checkForUpdates();

    // 返回停止监听的函数
    return () => {
      isWatching = false;
    };
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<{
    id: string;
    name: string;
    email: string;
    picture?: string;
  } | null> {
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      const user = authInstance.currentUser.get();
      const profile = user.getBasicProfile();

      return {
        id: profile.getId(),
        name: profile.getName(),
        email: profile.getEmail(),
        picture: profile.getImageUrl()
      };
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }
}

// 全局类型声明
declare global {
  interface Window {
    gapi: unknown;
  }
}

// 单例实例
export const googleDocsService = new GoogleDocsService();

// 便捷函数
export const authenticateGoogle = () => googleDocsService.authenticate();
export const createGoogleDoc = (title: string, content?: string) => 
  googleDocsService.createDocument(title, content);
export const importGoogleDoc = (documentId: string) => 
  googleDocsService.importDocument(documentId);
export const exportToGoogleDocs = (title: string, content: string) => 
  googleDocsService.exportDocument(title, content);

// 在开发环境下挂载到window
if (process.env.NODE_ENV === 'development') {
  (window as unknown).googleDocsService = googleDocsService;
}

export default GoogleDocsService;