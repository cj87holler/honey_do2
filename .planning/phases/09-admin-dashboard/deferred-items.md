# Phase 9 Deferred Items

Items discovered during execution that are OUT OF SCOPE for the current plan but worth tracking.

## Pre-existing TypeScript errors (noticed during 09-01 execution)

- `tests/task/update-task-status.test.ts:107` — Tuple type '[]' has no element at index '0'
- `tests/task/update-task-status.test.ts:108` — `setArg` is possibly `undefined`
- `tests/task/update-task-status.test.ts:153` — Conversion of type 'null' to type 'Mock<...>' overlap warning
- `tests/task/update-task-status.test.ts:157` — Same as above

These pre-exist Phase 9 and are unrelated to admin work. Should be cleaned up in a separate quick task.
