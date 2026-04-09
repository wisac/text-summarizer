import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateDto {
   @IsString()
   @IsNotEmpty()
   modelName: string;

   @IsString()
   @IsNotEmpty()
   prompt: string;
}
