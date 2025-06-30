import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package, PackageStatus } from './entities/package.entity';
import { PackageService } from './entities/package-service.entity';

interface CreatePackageDto {
  name: string;
  description: string;
  price: number;
  duration: number;
  services: Array<{
    serviceId: string;
    serviceName: string;
    quantity: number;
  }>;
}

interface UpdatePackageDto {
  name?: string;
  description?: string;
  price?: number;
  duration?: number;
  status?: string;
  services?: Array<{
    serviceId: string;
    serviceName: string;
    quantity: number;
  }>;
}

interface GetPackagesParams {
  tenantId: string;
  locationId: string;
  page: number;
  limit: number;
  status?: string;
}

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
    @InjectRepository(PackageService)
    private readonly packageServiceRepository: Repository<PackageService>,
  ) {}

  async getPackages(params: GetPackagesParams) {
    const { tenantId, locationId, page, limit, status } = params;
    const skip = (page - 1) * limit;

    const queryBuilder = this.packageRepository
      .createQueryBuilder('package')
      .leftJoinAndSelect('package.services', 'services')
      .where('package.tenant.id = :tenantId', { tenantId });

    if (locationId) {
      queryBuilder.andWhere('package.locationId = :locationId', { locationId });
    }

    if (status) {
      queryBuilder.andWhere('package.status = :status', { status });
    }

    const [packages, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('package.createdAt', 'DESC')
      .getManyAndCount();

    return {
      packages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createPackage(createPackageDto: CreatePackageDto, tenantId: string, locationId: string) {
    const package_ = this.packageRepository.create({
      name: createPackageDto.name,
      description: createPackageDto.description,
      price: createPackageDto.price,
      duration: createPackageDto.duration,
      status: PackageStatus.ACTIVE,
      tenant: Promise.resolve({ id: tenantId } as any),
      locationId,
    });

    const savedPackage = await this.packageRepository.save(package_);

    // Create package services
    const packageServices: PackageService[] = [];
    for (const service of createPackageDto.services) {
      // Fetch the Service entity
      const serviceEntity = await this.packageServiceRepository.manager.getRepository('Service').findOne({ where: { id: service.serviceId } });
      if (serviceEntity) {
        packageServices.push(this.packageServiceRepository.create({
          service: serviceEntity,
          quantity: service.quantity,
          package: savedPackage,
        }));
      }
    }
    await this.packageServiceRepository.save(packageServices);

    return this.getPackage(savedPackage.id, tenantId, locationId);
  }

  async getPackage(id: string, tenantId: string, locationId: string) {
    const package_ = await this.packageRepository.findOne({
      where: { id },
      relations: ['services', 'tenant'],
    });

    if (!package_) {
      throw new NotFoundException('Package not found');
    }

    const tenant = await package_.tenant;
    if (tenant.id !== tenantId) {
      throw new NotFoundException('Package not found');
    }

    if (locationId && package_.locationId !== locationId) {
      throw new NotFoundException('Package not found');
    }

    return package_;
  }

  async updatePackage(id: string, updatePackageDto: UpdatePackageDto, tenantId: string, locationId: string) {
    const package_ = await this.getPackage(id, tenantId, locationId);

    if (updatePackageDto.name) {
      package_.name = updatePackageDto.name;
    }
    if (updatePackageDto.description) {
      package_.description = updatePackageDto.description;
    }
    if (updatePackageDto.price) {
      package_.price = updatePackageDto.price;
    }
    if (updatePackageDto.duration) {
      package_.duration = updatePackageDto.duration;
    }
    if (updatePackageDto.status) {
      package_.status = updatePackageDto.status as PackageStatus;
    }

    const savedPackage = await this.packageRepository.save(package_);

    // Update package services if provided
    if (updatePackageDto.services) {
      // Remove existing services
      await this.packageServiceRepository.delete({ package: { id: savedPackage.id } });

      // Create new services
      const packageServices: PackageService[] = [];
      for (const service of updatePackageDto.services) {
        const serviceEntity = await this.packageServiceRepository.manager.getRepository('Service').findOne({ where: { id: service.serviceId } });
        if (serviceEntity) {
          packageServices.push(this.packageServiceRepository.create({
            service: serviceEntity,
            quantity: service.quantity,
            package: savedPackage,
          }));
        }
      }
      await this.packageServiceRepository.save(packageServices);
    }

    return this.getPackage(savedPackage.id, tenantId, locationId);
  }

  async deletePackage(id: string, tenantId: string, locationId: string) {
    const package_ = await this.getPackage(id, tenantId, locationId);
    await this.packageRepository.remove(package_);
    return { message: 'Package deleted successfully' };
  }
} 