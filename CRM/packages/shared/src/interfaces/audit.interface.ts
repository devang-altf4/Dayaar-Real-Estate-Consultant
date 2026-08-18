export interface IAuditLog {
  _id: string;
  organizationId: string;
  actorId: string;
  actorName?: string;
  actorRole?: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  createdAt: string | Date;
}
