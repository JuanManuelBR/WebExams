import {
  IsEmail,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";

export class EditUserDto {
  @IsOptional()
  @IsString()
  nombres?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  contrasena?: string;

  @ValidateIf((o) => o.contrasena !== undefined)
  @IsString()
  confirmar_nueva_contrasena?: string;

  @IsOptional()
  @IsString()
  foto_perfil?: string;
}