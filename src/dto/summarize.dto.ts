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
   @IsOptional()
   @IsNotEmpty()
   text: string;

   @IsOptional()
   files?: any;

   @IsNumber()
   @IsOptional()
   @Min(0)
   @Max(1)
   creativity?: number;
}
