export interface Project {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectRequest {
  name: string;
  description?: string;
}

export interface ProjectResponse extends Project {
  // Add any additional response-specific fields if needed
}