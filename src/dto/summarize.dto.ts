import {
   IsNotEmpty,
   IsNumber,
   IsOptional,
   IsString,
   Max,
   Min,
} from 'class-validator';

export class SummarizeDto {
   @IsString()
   @IsNotEmpty()
   text: string;

   @IsOptional()
   files?: any;

   @IsNumber()
   @Min(0)
   @Max(1)
   creativity: number;

   @IsString()
   @IsOptional()
   modelName?: string;
}
