# How retrieval works

Documents are split into short, overlapping chunks. The overlap preserves some context when a sentence or idea crosses a chunk boundary. OpenAI's `text-embedding-3-small` model turns each chunk into a 1536-dimensional vector.

At question time, the app embeds the question and uses pgvector cosine distance to find the closest chunks. Those chunks are numbered and passed to the chat model. The answer prompt requires citations such as `[1]` and tells the model to say it does not know when the supplied context is insufficient.

The API streams plain text. Source metadata is sent before the body in the `x-sources` response header as base64-encoded JSON, allowing the interface to show citations while the answer arrives.
