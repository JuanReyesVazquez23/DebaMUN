import { Transform, Type } from 'class-transformer';
import { IsIn, IsString, IsUUID, Length } from 'class-validator';
import type { QuestionKind } from '../debate/question.generator.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateDebateSessionDto {
  @IsUUID()
  delegateId!: string;

  @Type(() => Number)
  @IsIn([1, 2, 3])
  difficulty: 1 | 2 | 3 = 2;
}

export class NextQuestionDto {
  @IsUUID()
  sessionId!: string;
}

export class SubmitTurnDto {
  @IsUUID()
  sessionId!: string;

  @IsString()
  @Length(4, 80)
  questionId!: string;

  @Transform(trim)
  @IsString()
  @Length(10, 1200)
  question!: string;

  @IsIn(['apertura', 'seguimiento', 'contrapunto', 'crisis', 'resolucion', 'punto_informacion', 'datos'])
  kind!: QuestionKind;

  @Transform(trim)
  @IsString()
  @Length(12, 6000)
  answer!: string;
}
