import { PartialType } from '@nestjs/swagger';
import { CreateCartDto } from './add-cart.dto';

export class UpdateCartDto extends PartialType(CreateCartDto) {}
