import { defineType, defineField } from "sanity";

export default defineType({
  name: "encryptedFile",
  title: "Encrypted File",
  type: "document",
  fields: [
    defineField({
      name: "name",
      type: "string",
    }),

    defineField({
      name: "size", // original plaintext size
      type: "number",
    }),

    defineField({
      name: "mimeType",
      type: "string",
    }),

    defineField({
      name: "chunks",
      title: "Encrypted Chunks",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "index",
              type: "number",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "asset",
              type: "file",
              validation: (Rule) => Rule.required(),
            }),
          ],
        },
      ],
    }),

    defineField({
      name: "crypto",
      type: "object",
      fields: [
        defineField({ name: "keyNonce", type: "string" }),
        defineField({ name: "fileKeyCipher", type: "string" }),

        defineField({
          name: "chunkNonces",
          title: "Chunk Nonces",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                defineField({
                  name: "index",
                  type: "number",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "nonce",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
              ],
            },
          ],
        }),
      ],
    }),

    defineField({
      name: "uploadedAt",
      type: "datetime",
    }),
  ],
});
