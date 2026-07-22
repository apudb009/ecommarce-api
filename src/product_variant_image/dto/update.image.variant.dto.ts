import { PartialType } from '@nestjs/swagger';
import { AddImageVariantDto } from './add.image.variant.dto';

export class UpdateImageVariantDto extends PartialType(AddImageVariantDto) {}
