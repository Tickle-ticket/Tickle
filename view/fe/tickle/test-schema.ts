import { Schema } from '@effect/schema';

const testSchema = Schema.transform(
  Schema.Struct({
    priceGrade: Schema.optional(Schema.String),
    grade: Schema.optional(Schema.String),
  }),
  Schema.Struct({
    grade: Schema.String,
  }),
  {
    decode: (input: any) => ({
      grade: input.grade || input.priceGrade || '일반'
    }),
    encode: (output: any) => ({
      priceGrade: output.grade
    })
  }
);

try {
  console.log(Schema.decodeUnknownSync(testSchema)({ priceGrade: 'VIP' }));
} catch (e: any) {
  console.error(e.message);
}
