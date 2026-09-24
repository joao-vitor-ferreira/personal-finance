import { ApiProperty } from '@nestjs/swagger';
import { IsNonBlank } from '../../common/validators/non-blank.validator.js';
import { MaxUtf8Bytes } from '../../common/validators/max-utf8-bytes.validator.js';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'João da Silva', minLength: 2, maxLength: 120 })
  @IsString()
  @IsNonBlank()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'joao@example.com', maxLength: 320 })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({ example: 'senha-segura-123', minLength: 8, maxLength: 72 })
  @IsString()
  @IsNonBlank()
  @MinLength(8)
  @MaxLength(72)
  @MaxUtf8Bytes(72)
  password: string;
}
