import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('DriveFileContent')
export class DriveFileContentDTO {
  @Field()
  content: string;

  @Field()
  mimeType: string;
}
