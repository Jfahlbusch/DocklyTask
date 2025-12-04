export interface User {
  id: string
  email: string
  name?: string
  phone?: string
  avatar?: string
  role: UserRole
  customerId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Customer {
  id: string
  name: string
  tenantId?: string
  mainContact?: string
  info?: string
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  description?: string
  icon?: string
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: string
  name: string
  color?: string
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  goLiveDate?: Date
  customerId: string
  createdAt: Date
  updatedAt: Date
}

export interface ProjectAssignee {
  id: string
  projectId: string
  userId: string
  role?: string
  createdAt: Date
}

export interface ProjectProduct {
  id: string
  projectId: string
  productId: string
  createdAt: Date
}

export interface TaskProduct {
  id: string
  taskId: string
  productId: string
  product?: Product
  createdAt: Date
}

export interface Task {
  id: string
  taskNumber?: number
  title: string
  description?: string
  status: string
  statusId?: string
  priority: TaskPriority
  startDate?: Date
  dueDate?: Date
  customerId?: string
  projectId?: string
  categoryId?: string
  assigneeId?: string
  teamId?: string
  isCustomerVisible?: boolean
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export interface TaskStatus {
  id: string
  name: string
  label: string
  description?: string
  color: string
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SubTask {
  id: string
  title: string
  status: string
  statusId?: string
  taskId: string
  createdAt: Date
  updatedAt: Date
}

export interface TaskAttachment {
  id: string
  fileName: string
  fileSize?: number
  fileType?: string
  fileUrl: string
  taskId: string
  createdAt: Date
}

export interface TaskComment {
  id: string
  content: string
  taskId: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface CommentAttachment {
  id: string
  fileName: string
  fileSize?: number
  fileType?: string
  fileUrl: string
  commentId: string
  createdAt: Date
}

export interface ProjectTemplate {
  id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface TemplateProduct {
  id: string
  templateId: string
  productId: string
  createdAt: Date
}

export interface TemplateTask {
  id: string
  title: string
  description?: string
  priority: TaskPriority
  templateId: string
  parentTaskId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Team {
  id: string
  name: string
  description?: string
  color?: string
  createdAt: Date
  updatedAt: Date
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role?: string
  createdAt: Date
}

export interface RolePermission {
  id: string
  role: UserRole
  resource: string
  canRead: boolean
  canWrite: boolean
  canDelete: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AppConfiguration {
  id: string
  appName: string
  appLogo?: string
  appFavicon?: string
  primaryColor: string
  secondaryColor: string
  mode: AppMode
  createdAt: Date
  updatedAt: Date
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  VIEWER = 'VIEWER'
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum AppMode {
  DEMO = 'DEMO',
  PRODUCTIVE = 'PRODUCTIVE'
}