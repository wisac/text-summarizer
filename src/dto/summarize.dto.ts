import {
   IsNotEmpty,
   IsNumber,
   IsNumberString,
   IsOptional,
   IsString,
   Max,
   MIN,
   Min,
   MinLength,
} from 'class-validator';

export class SummarizeDto {
   @IsString()
   @IsOptional()
   @IsNotEmpty()
   text: string;

   @IsOptional()
   files?: any;

   @IsNumber()
   @IsOptional()
   @Min(0)
   @Max(1)
   creativity: number;

   @IsString()
   @IsOptional()
   modelName?: string;
}
