import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateModelDto {
   @IsString()
   @IsNotEmpty()
   modelName: string;
}
