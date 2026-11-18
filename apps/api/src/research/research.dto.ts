import { Transform } from 'class-transformer';
import { IsString, IsUUID, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class AskResearchDto {
  @IsUUID()
  delegateId!: string;

  @Transform(trim)
  @IsString()
  @Length(3, 600)
  question!: string;
}
