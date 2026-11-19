import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';
import type { CommitteeId } from '../countries/countries.types.js';
import { GRADES, type GradeId } from './grade.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateSessionDto {
  @Transform(trim)
  @IsString()
  @Length(2, 40)
  @Matches(/^[\p{L}\p{N} ._'’-]+$/u, {
    message: 'El nombre solo puede contener letras, números, espacios y . _ - ’',
  })
  username!: string;

  @Transform(trim)
  @IsString()
  @Length(2, 4)
  countryCode!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(['UNESCO', 'ECOSOC'])
  committee!: CommitteeId;

  @IsOptional()
  @IsIn(GRADES)
  grade?: GradeId;
}

export class RestoreSessionDto extends CreateSessionDto {
  @IsUUID()
  delegateId!: string;
}

export class FactQueryDto {
  @Transform(trim)
  @IsString()
  @Length(2, 4)
  countryCode!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  offset = 0;
}
