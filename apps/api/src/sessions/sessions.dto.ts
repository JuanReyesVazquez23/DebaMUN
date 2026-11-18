import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import type { CommitteeId } from '../countries/countries.types.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Grados escolares que puede cursar un delegado. */
export const GRADES = ['6', '7', '8', '9', '10', '11', '12', 'universidad'] as const;
export type GradeId = (typeof GRADES)[number];

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
