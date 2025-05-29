import { Controller } from '@nestjs/common';
import { PublicSiteService } from './public-site.service';

@Controller('public')
export class PublicSiteController {
  constructor(private readonly publicSiteService: PublicSiteService) {}
} 