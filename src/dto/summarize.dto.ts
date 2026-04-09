import { IsNotEmpty, IsString } from 'class-validator';

export class SummarizeDto {
   @IsString()
   @IsNotEmpty()
   text: string;
}
