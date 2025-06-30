import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleType } from './entities/role.entity';

interface GetRolesParams {
  tenantId: string;
  locationId: string;
  page: number;
  limit: number;
  type?: string;
  active?: boolean;
}

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async getRoles(params: GetRolesParams) {
    const { tenantId, locationId, page, limit, type, active } = params;
    const skip = (page - 1) * limit;

    const queryBuilder = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .where('role.tenant.id = :tenantId', { tenantId });

    if (locationId) {
      queryBuilder.andWhere('role.locationId = :locationId', { locationId });
    }

    if (type) {
      queryBuilder.andWhere('role.type = :type', { type });
    }

    if (active !== undefined) {
      queryBuilder.andWhere('role.active = :active', { active });
    }

    const [roles, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('role.createdAt', 'DESC')
      .getManyAndCount();

    return {
      roles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createRole(createRoleDto: any, tenantId: string, locationId: string) {
    const role = this.roleRepository.create({
      ...createRoleDto,
      tenant: Promise.resolve({ id: tenantId } as any),
      locationId,
    });

    const savedRole = await this.roleRepository.save(role) as unknown as Role;
    return this.getRoleWithRelations(savedRole.id);
  }

  async getRole(id: string, tenantId: string, locationId: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions', 'tenant'],
    });

    if (!role) {
      return null;
    }

    const tenant = await role.tenant;
    if (tenant.id !== tenantId) {
      return null;
    }

    if (locationId && role.locationId !== locationId) {
      return null;
    }

    return role;
  }

  async updateRole(id: string, updateRoleDto: any, tenantId: string, locationId: string) {
    const role = await this.getRole(id, tenantId, locationId);
    if (!role) {
      return null;
    }

    Object.assign(role, updateRoleDto);
    return this.roleRepository.save(role);
  }

  async deleteRole(id: string, tenantId: string, locationId: string) {
    const role = await this.getRole(id, tenantId, locationId);
    if (!role) {
      return { message: 'Role not found' };
    }

    await this.roleRepository.remove(role);
    return { message: 'Role deleted successfully' };
  }

  async getDefaultRoles(tenantId: string, locationId: string) {
    const defaultRoles = [
      {
        name: 'Administrator',
        description: 'Full access to all features and settings',
        type: RoleType.ADMIN,
        permissions: [
          'users:read',
          'users:write',
          'users:delete',
          'clients:read',
          'clients:write',
          'clients:delete',
          'invoices:read',
          'invoices:write',
          'invoices:delete',
          'appointments:read',
          'appointments:write',
          'appointments:delete',
          'reports:read',
          'reports:write',
          'settings:read',
          'settings:write',
        ],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Manager',
        description: 'Access to manage business operations',
        type: RoleType.MANAGER,
        permissions: [
          'clients:read',
          'clients:write',
          'invoices:read',
          'invoices:write',
          'appointments:read',
          'appointments:write',
          'reports:read',
          'settings:read',
        ],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Employee',
        description: 'Basic access to perform daily tasks',
        type: RoleType.EMPLOYEE,
        permissions: [
          'clients:read',
          'clients:write',
          'invoices:read',
          'invoices:write',
          'appointments:read',
          'appointments:write',
        ],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Client',
        description: 'Limited access to view own information',
        type: RoleType.CLIENT,
        permissions: [
          'profile:read',
          'profile:write',
          'appointments:read',
          'invoices:read',
        ],
        isActive: true,
        isDefault: true,
      },
      {
        name: 'Guest',
        description: 'Minimal access for public information',
        type: RoleType.GUEST,
        permissions: [
          'public:read',
        ],
        isActive: true,
        isDefault: true,
      },
    ];

    return {
      roles: defaultRoles,
      total: defaultRoles.length,
      tenantId,
      locationId,
    };
  }

  async getAvailablePermissions() {
    return {
      permissions: [
        // User permissions
        'users:read', 'users:write', 'users:delete',
        
        // Client permissions
        'clients:read', 'clients:write', 'clients:delete',
        
        // Invoice permissions
        'invoices:read', 'invoices:write', 'invoices:delete',
        
        // Report permissions
        'reports:read', 'reports:write',
        
        // Settings permissions
        'settings:read', 'settings:write',
        
        // Role permissions
        'roles:read', 'roles:write', 'roles:delete',
        
        // Timeline permissions
        'timeline:read', 'timeline:write', 'timeline:delete',
        
        // Package permissions
        'packages:read', 'packages:write', 'packages:delete',
        
        // Stock permissions
        'stock:read', 'stock:write', 'stock:delete',
        
        // History permissions
        'history:read',
        
        // Workflow permissions
        'workflows:read', 'workflows:write',
        
        // User data permissions
        'user-data:read', 'user-data:write', 'user-data:delete',
      ],
    };
  }

  private async getRoleWithRelations(id: string) {
    return this.roleRepository.findOne({
      where: { id },
      relations: ['permissions', 'tenant'],
    });
  }
} 