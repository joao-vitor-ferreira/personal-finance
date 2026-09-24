import { ApiProperty } from '@nestjs/swagger';
import { MaxUtf8Bytes } from '../../common/validators/max-utf8-bytes.validator.js';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'joao@example.com' })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({ example: 'senha-segura-123' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @MaxUtf8Bytes(72)
  password: string;
}
