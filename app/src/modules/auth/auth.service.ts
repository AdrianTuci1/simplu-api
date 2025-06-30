import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import * as bcrypt from 'bcrypt';

interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async validateUserByEmail(email: string, password: string, tenantId?: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ 
      where: { email },
      relations: ['tenants']
    });
    
    if (user && await bcrypt.compare(password, user.password)) {
      // If tenantId is provided, validate that user belongs to that tenant
      if (tenantId) {
        const hasTenant = user.tenants.some(tenant => tenant.id === tenantId);
        if (!hasTenant) {
          return null;
        }
      }
      return user;
    }
    return null;
  }

  async login(user: User) {
    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string, tenantId?: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.validateUser(payload.sub);
      
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // If tenantId is provided, validate that user belongs to that tenant
      if (tenantId) {
        const userWithTenants = await this.userRepository.findOne({
          where: { id: user.id },
          relations: ['tenants']
        });
        
        if (!userWithTenants || !userWithTenants.tenants.some(tenant => tenant.id === tenantId)) {
          throw new UnauthorizedException('User does not belong to this tenant');
        }
      }

      return this.login(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async register(userData: RegisterDto, tenantId?: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = this.userRepository.create({
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
    });

    const savedUser = await this.userRepository.save(user);

    // If tenantId is provided, associate user with tenant
    if (tenantId) {
      const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
      if (tenant) {
        savedUser.tenants = [tenant];
        await this.userRepository.save(savedUser);
      }
    }

    return savedUser;
  }

  async getCurrentUser(token: string, tenantId?: string) {
    try {
      const cleanToken = token.replace('Bearer ', '');
      const payload = this.jwtService.verify(cleanToken);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['tenants', 'employee']
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // If tenantId is provided, validate that user belongs to that tenant
      if (tenantId && !user.tenants.some(tenant => tenant.id === tenantId)) {
        throw new UnauthorizedException('User does not belong to this tenant');
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        tenants: user.tenants,
        employee: user.employee,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
} 